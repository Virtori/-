# BodyDream Coach 4.3 — Journey

Offline Android workout journal with step-by-step exercise cues, strength training, football, nutrition and local backups.

## Version 4.3

- Journey tab with XP levels, six achievements and four weekly goals.
- 28-day activity calendar, active-week series and recorded exercise bests.
- Post-workout summary with points and newly unlocked achievements.
- Points are derived from existing records; repeat sessions on the same day do not multiply them. Rest days are allowed, and points never expire.
- Existing version-4 JSON backups remain compatible.

## Installation and data transfer

4.3 uses application ID `com.bodydream.trainer.journey` and installs alongside 4.2. The first 4.2 build used an ephemeral CI debug signing key, so this avoids deleting the old installation to work around signature conflicts.

1. In 4.2, open Settings → Save JSON.
2. Install the 4.3 debug APK from the successful Actions artifact.
3. In 4.3, open Settings → Restore and choose the saved JSON.
4. Verify the profile, history and photos in 4.3 before removing any old installation.

The APK is a personal testing build, not a Play Store release. Future production distribution requires a private, durable signing key. Data and photos remain on the device; there is no cloud AI or camera-based technique diagnosis.

## Validation

Actions checks JavaScript syntax, runs browser interaction tests at phone and tablet widths, builds the Android APK and computes its SHA-256 checksum. UI tests cover old backups, record persistence, duplicate/future records, badges and workout completion. Review images are retained as a separate CI artifact.
