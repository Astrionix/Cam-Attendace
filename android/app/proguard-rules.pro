# Proguard rules for PoultryAttend
-keep class org.tensorflow.lite.** { *; }
-keep class com.google.mlkit.** { *; }
-keepattributes *Annotation*
-keepclassmembers class * {
    @androidx.room.* <methods>;
}
-keep class kotlinx.serialization.** { *; }
-keepclassmembers class com.poultry.attend.data.** { *; }
