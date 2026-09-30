# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.

# Optimización general de R8 / ProGuard
-repackageclasses ''
-allowaccessmodification

# Preservar atributos necesarios para el WebView y reflection
-keepattributes *Annotation*,Exceptions,InnerClasses,Signature,EnclosingMethod,SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Capacitor Core y Plugins
-keep public class * extends com.getcapacitor.Plugin
-keepclassmembers class * extends com.getcapacitor.Plugin {
    @com.getcapacitor.PluginMethod public *;
}
-keep public class com.getcapacitor.** { *; }

# Google Mobile Ads / AdMob
-keep public class com.google.android.gms.ads.** { *; }
-keep public interface com.google.android.gms.ads.** { *; }
-dontwarn com.google.android.gms.ads.**

# Cordova / Plugins si existen
-keep class org.apache.cordova.** { *; }
-keep public class * extends org.apache.cordova.CordovaPlugin

# AndroidX WebView y JS Interfaces
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
