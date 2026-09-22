// Retired on 21/09/2026.
// This script used to upload the single-file build and the test APK to a Supabase edge function
// ("abyssos", in the employer's project). That function and its bucket were deleted that day:
// a personal game does not belong on company infrastructure, and the upload token lived in plain text.
// The game is published by GitHub Pages on every push to main (see .github/workflows/pages.yml),
// and the workflow puts the APK next to it. Nothing else is needed.
console.log('publish-web is retired: the game is published by GitHub Pages on every push to main.');
