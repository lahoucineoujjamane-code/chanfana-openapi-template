plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.tabib.herbs"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.tabib.herbs"
        minSdk = 24
        targetSdk = 36
        // رقم الإصدار يزيد تلقائياً مع كل بناء على GitHub حتى يقبل أندرويد التحديث
        versionCode = (System.getenv("GITHUB_RUN_NUMBER") ?: "0").toInt() + 1
        versionName = "1.1." + (System.getenv("GITHUB_RUN_NUMBER") ?: "0")
    }

    // واجهة التطبيق تُنسخ من مجلد www المشترك مع نسخة الويب
    sourceSets {
        getByName("main") {
            assets.srcDirs("../../www")
        }
    }

    // التوقيع: إذا وُجد مفتاح في متغيرات البيئة (من GitHub Secrets) يُستعمل،
    // وإلا يُستعمل مفتاح التصحيح (يحفظه سير العمل في الذاكرة المؤقتة ليبقى ثابتاً).
    val ksFile = System.getenv("TABIB_KEYSTORE_FILE")
    signingConfigs {
        if (ksFile != null && file(ksFile).exists()) {
            create("tabib") {
                storeFile = file(ksFile)
                storePassword = System.getenv("TABIB_KEYSTORE_PASSWORD")
                keyAlias = System.getenv("TABIB_KEY_ALIAS")
                keyPassword = System.getenv("TABIB_KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.findByName("tabib") ?: signingConfigs.getByName("debug")
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
