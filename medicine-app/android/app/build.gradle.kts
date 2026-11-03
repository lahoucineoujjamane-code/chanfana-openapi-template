plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.tabib.herbs"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.tabib.herbs"
        minSdk = 24
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"
    }

    // واجهة التطبيق تُنسخ من مجلد www المشترك مع نسخة الويب
    sourceSets {
        getByName("main") {
            assets.srcDirs("../../www")
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            // توقيع بمفتاح التصحيح حتى يكون ملف APK قابلاً للتثبيت مباشرة.
            // للنشر على Google Play استبدله بمفتاح توقيع خاص بك.
            signingConfig = signingConfigs.getByName("debug")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.activity:activity-ktx:1.9.3")
    implementation("androidx.webkit:webkit:1.12.1")
}
