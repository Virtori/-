plugins {
    id("com.android.application")
}

android {
    namespace = "com.bodydream.trainer"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.bodydream.trainer.coach"
        minSdk = 24
        targetSdk = 35
        versionCode = 10
        versionName = "4.6.0-muscles"
    }

    buildTypes {
        debug { isDebuggable = true }
        release { isMinifyEnabled = false }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    buildFeatures { buildConfig = false }
}

