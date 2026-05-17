# ProGuard / R8 keep rules for Lumin Chess release builds.

# Capacitor + Cordova use reflection — never strip or rename these.
-keep class com.getcapacitor.** { *; }
-keep public class * extends com.getcapacitor.Plugin
-keep class org.apache.cordova.** { *; }

# WebView JavaScriptInterface methods, in case custom ones are added later.
-keepclassmembers class com.lumi.lumichess.** {
    @android.webkit.JavascriptInterface <methods>;
}

# Preserve line numbers in stack traces (useful for crash reports) while
# hiding original source file names.
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
