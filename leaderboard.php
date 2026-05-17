<?php
// Lumin Chess — shared leaderboard backend.
//
// Drop this file in the same directory as index.html on your web host (e.g.,
// Bluehost public_html). Data persists in leaderboard-data.json next to this
// file; PHP creates it on the first write — the directory needs to be writable
// by the PHP user, which is the default on shared cPanel hosts.
//
// API:
//   GET  leaderboard.php           -> { "1": [...], "2": [...], "3": [...] }
//   POST leaderboard.php           -> same shape, after inserting an entry
//        body: { "level": 1, "name": "Peter", "moves": 14 }

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
// CORS — let the same code serve the web (same-origin) AND the Capacitor
// Android/iOS apps (which load from capacitor://localhost or https://localhost
// and need cross-origin access). The leaderboard is fully public; * is fine.
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Max-Age: 86400');

// Browsers preflight any "complex" POST (Content-Type: application/json triggers
// this). Return 204 immediately so the actual POST can proceed.
if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

$DATA_FILE = __DIR__ . '/leaderboard-data.json';
$MAX_ENTRIES = 100;
$NAME_MAX_CHARS = 20;
// Levels are validated as positive integers within this range. The data file
// stores them as sparse top-level keys keyed by integer-as-string, so adding
// new levels (including in-between insertions with new stable ids) needs no
// schema change — just a POST with a fresh level number.
$MIN_LEVEL_ID = 1;
$MAX_LEVEL_ID = 1000;
// Must mirror the EMOJI_LIST in index.html. All single-codepoint emojis (no
// VS-16) so the byte-equality whitelist works regardless of client OS.
$ALLOWED_EMOJIS = [
  '🏆', '🎯', '🚀', '⚡', '🔥', '💎',
  '🌈', '✨', '🍀', '🌙', '⭐', '💫',
  '🐱', '🐶', '🦊', '🐼', '🦁', '🐸',
  '🐧', '🦄', '🐙', '🦋', '🌸', '🐢',
];
$DEFAULT_EMOJI = '🏆';

function load_data() {
  global $DATA_FILE, $MIN_LEVEL_ID, $MAX_LEVEL_ID;
  if (!file_exists($DATA_FILE)) { return []; }
  $raw = @file_get_contents($DATA_FILE);
  if ($raw === false || $raw === '') { return []; }
  $data = json_decode($raw, true);
  if (!is_array($data)) { return []; }
  // Sparse dict keyed by integer-as-string. Reject any other keys/values so a
  // malformed file can't propagate junk into responses.
  $clean = [];
  foreach ($data as $k => $v) {
    if (!is_array($v)) { continue; }
    if (!ctype_digit((string)$k)) { continue; }
    $intK = (int)$k;
    if ($intK < $MIN_LEVEL_ID || $intK > $MAX_LEVEL_ID) { continue; }
    $clean[(string)$intK] = $v;
  }
  return $clean;
}

function save_data($data) {
  global $DATA_FILE;
  $fp = @fopen($DATA_FILE, 'c+');
  if (!$fp) { return false; }
  // Exclusive lock so concurrent submissions don't overwrite each other.
  if (!flock($fp, LOCK_EX)) { fclose($fp); return false; }
  ftruncate($fp, 0);
  rewind($fp);
  // Cast the TOP-LEVEL to object so an empty dict serialises as `{}` not `[]`.
  // We can't use JSON_FORCE_OBJECT — that would also convert the inner per-level
  // entry arrays into objects, which breaks Array.isArray() on the client.
  fwrite($fp, json_encode((object)$data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
  fflush($fp);
  flock($fp, LOCK_UN);
  fclose($fp);
  return true;
}

function emit_json($data) {
  // Cast top-level so `{}` (not `[]`) goes on the wire when there are no
  // entries. Inner entry lists stay as JSON arrays (Array.isArray() on the
  // client depends on this).
  echo json_encode((object)$data, JSON_UNESCAPED_UNICODE);
}

$method = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : 'GET';

if ($method === 'GET') {
  emit_json(load_data());
  exit;
}

if ($method === 'POST') {
  $body = file_get_contents('php://input');
  $input = json_decode($body, true);
  if (!is_array($input)) {
    http_response_code(400);
    echo json_encode(['error' => 'invalid body']);
    exit;
  }

  $levelInt = isset($input['level']) ? (int)$input['level'] : 0;
  $level = (string)$levelInt;
  $name = isset($input['name']) ? (string)$input['name'] : '';
  $moves = isset($input['moves']) ? (int)$input['moves'] : -1;
  $emoji = isset($input['emoji']) ? (string)$input['emoji'] : '';
  // Lapse from first move to win, in ms. Cap at 10 hours to reject garbage.
  $lapseMs = isset($input['lapseMs']) ? (int)$input['lapseMs'] : 0;
  if ($lapseMs < 0 || $lapseMs > 36000000) { $lapseMs = 0; }

  // Strip control chars, trim, cap 20 chars (UTF-8 aware when mbstring exists).
  $name = preg_replace('/[\x00-\x1F\x7F]/u', '', $name);
  $name = trim($name);
  if (function_exists('mb_substr')) {
    $name = mb_substr($name, 0, $NAME_MAX_CHARS, 'UTF-8');
  } else {
    $name = substr($name, 0, $NAME_MAX_CHARS);
  }
  if ($name === '') { $name = 'Anonymous'; }

  // Whitelist the emoji byte-exact against the canonical set; anything else
  // (including missing) silently falls back to the default. No errors raised
  // — we'd rather record a slightly different avatar than reject the score.
  if (!in_array($emoji, $ALLOWED_EMOJIS, true)) { $emoji = $DEFAULT_EMOJI; }

  if ($levelInt < $MIN_LEVEL_ID || $levelInt > $MAX_LEVEL_ID || $moves < 1 || $moves > 9999) {
    http_response_code(400);
    echo json_encode(['error' => 'invalid level or moves']);
    exit;
  }

  $data = load_data();
  // First entry for this level — initialise the bucket on the fly.
  if (!isset($data[$level])) { $data[$level] = []; }
  // Server is the source of truth for the submission timestamp — sorted on
  // tiebreak so whoever submitted earlier ranks higher. Stored as milliseconds
  // since epoch (fits in PHP int on 64-bit hosts; Bluehost shared is 64-bit).
  $data[$level][] = [
    'name' => $name,
    'emoji' => $emoji,
    'moves' => $moves,
    'lapseMs' => $lapseMs,
    'date' => date('Y-m-d'),
    'submitted' => (int)round(microtime(true) * 1000),
  ];
  usort($data[$level], function ($a, $b) {
    if ($a['moves'] !== $b['moves']) { return $a['moves'] - $b['moves']; }
    $aLapse = isset($a['lapseMs']) ? (int)$a['lapseMs'] : 0;
    $bLapse = isset($b['lapseMs']) ? (int)$b['lapseMs'] : 0;
    if ($aLapse !== $bLapse) { return $aLapse - $bLapse; }
    $aSub = isset($a['submitted']) ? (int)$a['submitted'] : 0;
    $bSub = isset($b['submitted']) ? (int)$b['submitted'] : 0;
    return $aSub - $bSub;
  });
  $data[$level] = array_slice($data[$level], 0, $MAX_ENTRIES);
  save_data($data);
  emit_json($data);
  exit;
}

http_response_code(405);
echo json_encode(['error' => 'method not allowed']);
