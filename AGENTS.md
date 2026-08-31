# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

This project is pinned to **Expo SDK 57.0.9 / React Native 0.86.2 / React 19.2.3**. These
are current, real versions (SDK 57 shipped Aug 2026; the 0.86.2 patch fixed a Hermes
memory regression) — do not assume a training-data cutoff knows the right APIs for them.

## Confirmed SDK 57 facts (verified against live docs — don't re-derive these)

- **`expo-av` is fully removed as of SDK 55** and is no longer a dependency of this project
  (migrated to `expo-audio` — see change log below). `expo-audio`'s imperative API for a
  plain (non-component) module is `createAudioPlayer(uri)` returning an `AudioPlayer`, which
  emits `addListener('playbackStatusUpdate', status => ...)` with `status.didJustFinish` for
  cleanup via `.remove()`. `useAudioPlayer`/`useAudioPlayerStatus` are hooks — component-only,
  not usable from a utility module. `setAudioModeAsync({ playsInSilentMode, interruptionMode
  })` configures the session. Unlike old `expo-av`, `expo-audio` has real web support
  (confirmed via docs), so no `Platform.OS === 'web'` special-casing is needed.
- **`Clipboard` was removed from `react-native` core back in RN 0.64.** This project is on
  0.86.2. Never `import { Clipboard } from 'react-native'`. Use `expo-clipboard` instead:
  `import * as Clipboard from 'expo-clipboard'`, then `await Clipboard.setStringAsync(text)`
  (works cross-platform, including web, without `Platform.OS` branching).
- **`expo-file-system/legacy` is the correct, documented import**, not a workaround. It's
  how you keep using the function-based API (`uploadAsync`, `readAsStringAsync`,
  `FileSystemUploadType.MULTIPART`) instead of the newer `File`/`Directory` classes. Don't
  "fix" `CreateStorefrontScreen.tsx`'s use of it unless deliberately migrating.
- **`expo-camera`'s current API** (`useCameraPermissions`, `CameraView`, `onBarcodeScanned`,
  `barcodeScannerSettings.barcodeTypes`) matches what `CameraQRScannerScreen.tsx` already
  uses. Verified against docs — no action needed there.
- **NativeWind does not process `className` on `react-native-reanimated`'s `Animated.View`**
  in this project's dependency versions. Confirmed live via DOM inspection (2026-08-31,
  session 10): every Tailwind utility class was silently dropped — only the animated `style`
  object came through, leaving the element with none of its intended position/size/color.
  This broke `BounceBadge`, `StatusBadge`, and `Skeleton` (all built session 8) without any
  build or type error — they looked fine in `tsc` and in the accessibility tree, just not on
  screen. **Never put `className` directly on `Animated.View`/`Animated.Text`.** The fix:
  give the outer `Animated.View` only the animated `style` (transform/opacity/position),
  and nest a plain `View`/`Text` inside carrying the `className`. See any of those three
  components for the pattern.

## Change Log

Most recent first. Add an entry here for every fix so changes stay traceable across sessions.

### 2026-08-31 (session 10) — Back button, storefront collapsing header, edit storefront, notification badges, toolbar payment/copy/centering, bottom scroll padding

User reported a batch of bugs and requests, all reproduced and verified live (`expo start
--web`) rather than fixed blind. `npx tsc --noEmit` clean throughout.

**Back button invisible on every screen — real bug, not a color/contrast issue.** DOM
inspection found React Navigation's default web back-button icon renders as a genuinely
zero-size element (`width: 0px; height: 0px`) via an SVG-filter tint mechanism that isn't
resolving correctly in this dependency combination — no color would have fixed it, there was
no paintable area at all. The click handler itself worked fine (confirmed: dispatching a
click on the invisible element still navigated back), so this was purely a rendering bug, not
a broken feature. Fixed by no longer using React Navigation's built-in back button at all:
new `src/components/HeaderBackButton.tsx` (plain Lucide `ArrowLeft` + `useNavigation().
goBack()`) wired as `headerLeft` in `App.tsx`'s `sharedScreenOptions`, applying to every
native-stack screen at once. Verified live: 22×22 real icon, `#111827` on the app's one
white header background (full contrast, matching the "black on white / white on black"
request — every current header is white, so black is universally correct today; the
component takes an optional `dark` prop for if a screen ever sets a dark headerStyle).

**Systemic bug found while investigating the "weird-looking favorites badge" report:**
`BounceBadge`'s `Animated.View` was combining `className` with an animated `style` — per the
new AGENTS.md fact above, NativeWind silently drops every Tailwind class in that combination.
The badge was rendering with zero positioning/background, just a bare "1" floating outside
the button. Same bug found (by inspection, without needing separate reports) in `StatusBadge`
and `Skeleton` — all three built in session 8, all three visually broken since then despite
passing `tsc` and looking fine in the accessibility tree. Fixed all three using the
outer-Animated.View-style-only / inner-plain-View-className pattern now documented above.
Also fixed in passing: `StatusBadge`'s unmatched-status fallback had been swept from indigo
to emerald by session 9's color sweep, making an unrecognized status look like "success" —
changed to neutral gray.

**`StorefrontScreen` restructured into a collapsing header.** Per the request ("header should
end after the search bar," "categories should move with scroll," "minimise into a line"):
the vendor block (logo/name/tagline/table badge), search bar, and Categories row all moved
into the product `FlatList`'s `ListHeaderComponent` — they now scroll normally as part of the
content, including Categories (previously a separate fixed element above the list). An
`onScroll` handler tracks the scroll offset via a ref-backed threshold (150px, avoiding a
`useState` write on every scroll tick) and toggles a compact pinned bar — small circular logo
+ business name + cart icon — absolutely positioned over the top of the list once the full
header has scrolled out of view. Deliberately implemented as a plain threshold-based show/hide
rather than a Reanimated scroll-driven interpolation, given the `Animated.View`/`className`
bug found in the same session — a smooth crossfade is a reasonable future enhancement but
adds real risk that wasn't worth it here. Verified live via direct scroll-offset injection:
confirmed the full header's name element moves to a negative `top` (scrolled off-screen)
while the compact bar's name renders at a fixed position near the top — exactly the intended
effect.

**Merchants can now edit an existing storefront**, not just create new ones.
`CreateStorefrontScreen` gained an `editStorefrontId` route param (`CreateStorefront: {
editStorefrontId: number } | undefined` in `types.ts`); when present it fetches the existing
storefront via `getMyStorefronts()`, pre-fills every field (including images, categories, and
location — parsed via the existing `parseStorefrontData` helper), and calls a new
`updateStorefront(storefrontId, body)` (added to `api.ts` + `demoEngine.ts`, PUT
`/api/business/storefronts/:id`) instead of `createStorefront` on submit. `demoEngine`'s
implementation merges the free-form `data` blob rather than replacing it, so editing e.g. the
phone number doesn't wipe out `location`/`weeklyEvents` living in the same JSON field.
`DashboardScreen` gained a small pencil-icon button on each storefront card's header row;
`App.tsx`'s screen title switches between "New Storefront" and "Edit Storefront". Verified
live: editing Lagos Grill correctly showed "Edit Your Business Page," pre-filled every field
(confirmed the Nigeria-state picker's actual DOM `<select>` value, not just its visible
label), and swapped the submit button to "Save Changes."

**Notification badges on `DashboardScreen`.** For each storefront, fetches pending-order count
(`getOrders`, filtered `status === 'PENDING'`) and pending-activity count (unacknowledged
waiter calls + store requests + tips, via the existing `getStorefrontWaiterCalls`/
`getStorefrontRequests`/`getStorefrontTips` + their `status: 'PENDING' | 'ACKNOWLEDGED'`
field — this data already existed, it just wasn't surfaced on the dashboard) — fetched after
the storefront list itself resolves, so badges pop in without gating the whole screen's
loading state, and a failed count fetch for one storefront (caught per-storefront) doesn't
disrupt the rest. Small red count badges land on the "Orders" and "Activity" ops-row buttons
per card, plus a small red dot next to the business name as an at-a-glance summary when a
vendor has multiple storefronts. Verified live with real demo data (Lagos Grill: Orders 1,
Activity 6; Metropolitan Bistro: Activity 2; Neon Karaoke: Activity 1).

**`StorefrontToolbar` fixes:**
- Paid Request types (Shoutout/Song, not Karaoke) now show the same "Payment account" block
  the Tip popup already had — extracted into a shared `PaymentAccountBlock` sub-component to
  avoid duplicating the JSX, verified live (SHOUTOUT shows the block with bank details;
  switching to KARAOKE correctly hides both the Amount field and the payment block).
- "Tap to copy" text replaced with a `Copy` icon (`lucide-react-native`, `#059669`) next to
  the account number; the post-copy "Copied!" checkmark state is unchanged. Applies to both
  the Tip and Request popups since they now share the one component.
- Feedback popup's star row centered (`justify-center` on the row, `text-center` on its
  label) — was left-aligned by default.

**Bottom scroll padding audited project-wide** for every screen with a floating/absolute
button or toolbar overlapping scrollable content (grepped `absolute bottom-` across
`src/screens`). `DashboardScreen`'s `FlatList` had no extra bottom padding at all against its
floating "New Storefront" button (`p-4` only, i.e. 16px, against an ~80px floating button) —
the real bug, fixed to `pb-28`. `ProductCatalogEditorScreen` and `AccessPageManagerScreen`'s
list views already had `pb-24` against their own floating buttons (already adequate) but
bumped to `pb-28` for a larger safety margin per the request's emphasis. `StorefrontScreen`
already had `pb-[110px]`, confirmed sufficient, left as-is. Screens with a static (non-
floating) bottom button — `CartDrawerScreen`, `CheckoutScreen` — were confirmed to have no
overlap risk in the first place (the button is a normal flex sibling, not `position:
absolute`), so nothing there needed changing.

### 2026-08-31 (session 9) — Color scheme: blue → emerald, icon monochrome pass, gradient CTAs, responsive verification

Three items appeared directly in `Native guide.txt` (heading 5) mid-session-8, added by the
user in their own editor. Asked clarifying questions before touching anything (exact green,
icon-audit scope, responsive-audit depth) rather than guessing at a palette or how far to take
a project-wide icon sweep. `npx tsc --noEmit` clean throughout; verified live via
`expo start --web`.

**Primary color: #6C63FF (purple) → #059669 (emerald-600), with a "mini gradient" on CTAs.**
`tailwind.config.js`'s `primary` token changed, which auto-cascaded to every `bg-primary`/
`text-primary`/`border-primary` class already using it — no per-file changes needed for those.
Also added `gradientStart`/`gradientEnd` (`#10B981`/`#047857`) for the two-stop gradient.
Installed `expo-linear-gradient`; `CustomButton`'s `primary` variant now renders through a
real `<LinearGradient>` instead of a flat `bg-primary` fill — verified live on Login's "Sign
In" button (a genuine diagonal light-to-dark emerald gradient, not a flat color). Only
`CustomButton` callers get the gradient (Login/Register/ForgotPassword/VerifyOtp); the many
other hand-rolled `bg-primary` buttons across the app correctly render the new flat emerald
but not the gradient — flagged as a scoped decision, not an oversight, since converting every
CTA individually to `LinearGradient` is a separate, larger mechanical task.

**48 hardcoded hex occurrences of the old brand colors** (`#6C63FF`, `#4F46E5`, `#4338CA`,
`#3730A3`, plus a stray `#5B21B6` and a pre-existing inconsistent `#126B33` in
`MerchantProfileBankScreen`) were individually reviewed and reclassified rather than
blanket-replaced — a first attempt at a fast blanket sed (`color="#6C63FF"` →
`'#6C63FF'` pattern matching) was too broad and wrongly recolored several icon ternaries
(e.g. `RegisterScreen`'s active-role icon) to emerald instead of monochrome; caught by
reviewing every touched site afterward rather than trusting the sed blindly, and corrected.
Final rule applied: brand-signal chrome (loading spinners, a `Switch`'s "on" state,
`headerTintColor`) → new emerald; decorative icon glyphs → monochrome (`#374151`, or
`#111827` for larger/emphasized icons, per the user's "remove coloring from all icons except
the toolbar" instruction).

**55 literal `indigo-*`/`violet-*` Tailwind classes swept to `emerald-*`** (same numeric
shade) project-wide via a confirmed-safe blanket sed — grepped first to verify every match
was a Tailwind color class and nothing else (no stray English usage of the words "indigo"/
"violet" anywhere in the codebase). `StorefrontToolbar.tsx` was confirmed to use neither
family beforehand, so it needed no exclusion and is verified untouched (zero-diff) — it keeps
its own original color scheme exactly as instructed. One real regression this swept in and
had to fix separately: `ErrorBanner`'s `info` banner type had been indigo, `success` was
already emerald — sweeping both to emerald made them visually identical, so `info` was
recolored to slate-gray instead of colliding with `success`.

**Deliberate exceptions to "monochrome everywhere but the toolbar,"** flagged rather than
silently decided: icons whose color *is* the information, not decoration — `Trash2`/delete
(red), `Heart` favorited state (red), star ratings (amber/gold), and the order-status icons
in `OrderReceiptTrackerScreen` that already match `StatusBadge`'s existing red/amber/emerald
convention — plus a handful of small icons sitting on their own matching colored chip
background (`Ticket`/`Sparkles`/`MapPin`/`Music2`/`Bell`), where recoloring only the icon to
gray while its chip stayed colored would have looked like a mismatch rather than a design
choice.

**Responsive/split-screen verification** — rather than rewrite blind, verified live at a
320px viewport (a genuinely narrow split-screen width) on the two most visually dense
screens, `StorefrontScreen` and `DashboardScreen`. Both held up cleanly with no horizontal
overflow and correct flex-wrap behavior on the ops-row button grid. This app was already
Flexbox-first (React Native's default layout model, unlike web CSS's block default), so it
was largely responsive by construction already — logged in `Native guide.txt` as "verified,"
not "rebuilt," since that's what actually happened.

### 2026-08-31 (session 8) — ItemDetailsModal bottom sheet, headings 4 & 5 (haptics, skeletons, micro-animations, OLED dark mode, offline queue, state-level geofencing)

Terms email fixed (support@scancode.live → .ng; Privacy Policy's privacy@scancode.live → .ng
too, on a follow-up ask). Asked clarifying questions before starting the larger items (three
rounds — one had a contradictory multi-select answer that needed re-asking): SuperadminConsoleScreen
deferred entirely (needs a new 'superadmin' appState/navigator/demo account — a real
architecture decision, not attempted); ItemDetailsModalScreen built as a real
@gorhom/bottom-sheet; headings 4 & 5 scoped to aesthetic/interaction polish + offline order
queueing + state-level (not true) geofencing, explicitly skipping Bluetooth thermal printing
and background geofencing as too hardware-dependent to build blind. `npx tsc --noEmit` clean
throughout; verified live via `expo start --web` for everything below except native-only
behavior (haptic feel, background push delivery).

**Installed:** `@gorhom/bottom-sheet`, `react-native-gesture-handler`, `expo-haptics`,
`expo-location`, `@react-native-community/netinfo`. `expo-task-manager` was installed too but
turned out unused once geofencing was scoped to foreground-only state-level detection instead
of true background TaskManager geofencing — uninstalled again rather than left as dead weight.

**`ItemDetailsModalScreen`** (`src/screens/(customer)/ItemDetailsModalScreen.tsx`) — real
`BottomSheetModal` (backdrop, gesture-drag, snap point), not a plain `Modal`. Tapping a
product card in `StorefrontScreen` now opens it instead of only the quick "+" (which stays,
for fast single-add); shows a quantity stepper clamped to stock and an "Add N to Cart —
₦X" button. `CartContext.addToCart` gained an optional `qty` param (single atomic state
update instead of looping N calls). Required wrapping `App.tsx`'s root in
`GestureHandlerRootView` + `BottomSheetModalProvider`. **Verified live with a real caveat:**
the sheet's auto-open spring animation didn't fire on first `present()` in the web preview
(confirmed via bounding-rect inspection: the sheet was fully mounted with correct content,
just parked at its closed position) — a manual drag brought it into view correctly, proving
the component itself works; this is a known react-native-web + Reanimated timing quirk that
shouldn't occur on native (iOS/Android) where Reanimated's native driver drives the
animation, but isn't independently verifiable in this environment.

**Haptics** (`src/utils/haptics.ts`, `expo-haptics`, no-ops on web) — wired into add-to-cart,
favorite toggle, category selection, checkout success/failure, and every order action in
`LiveOrdersManagerScreen` (confirm/reject/complete/cancel, sound toggle, test alarm, dark-mode
toggle, tab switch).

**Skeleton loading shimmers** (`src/components/Skeleton.tsx`, Reanimated opacity pulse) —
wired into `DashboardScreen`, `StorefrontScreen`, and `StorefrontDirectoryScreen`'s loading
states (shaped like the real cards, not a generic spinner). Not swept project-wide — other
screens still use `ActivityIndicator`.

**Micro-animations** — `src/components/BounceBadge.tsx` (spring pop on count change, used for
`StorefrontScreen`'s cart/favorites badges); `StatusBadge` gained the same spring pop on every
status transition, everywhere it's already used.

**OLED dark mode for `LiveOrdersManagerScreen`** — scoped deliberately to this one screen (a
Moon/Sun toggle in its header) rather than a global NativeWind `dark:` theme, since no other
screen has dark-mode-aware styling designed for it yet. Uses the guide's exact `#09090B`/
`#18181B` values. Verified live: header, tab bar, and every order card correctly restyle;
confirmed other screens are unaffected (this is local component state, not a global
`colorScheme` switch).

**Offline order queueing** (`src/utils/offlineQueue.ts`, `@react-native-community/netinfo`) —
scoped to order placement only (`CheckoutScreen`), not admin actions (those need a live
connection to see incoming orders anyway). On a genuine offline `createOrder` failure, the
order is queued to AsyncStorage and a distinct "Order Queued" success state shown instead of
"Order Failed"; a `NetInfo` listener (`initOfflineQueue()`, called once in `App.tsx`) flushes
the queue automatically on reconnect. Deliberately does **not** pre-check connectivity before
every `createOrder` call — demo mode's `createOrder` never throws, so gating on a
pre-flight `isOffline()` check would have wrongly queued demo orders on a genuinely offline
test device instead of using demoEngine's perfectly-functional local resolution; queueing
only triggers from an actual caught failure.

**State-level "nearby storefronts" (not true geofencing)** — `src/utils/geoProximity.ts` +
`NIGERIA_STATE_CENTROIDS` (36 states + FCT capital coordinates) in `types.ts`. Storefronts
only capture a state name (`CreateStorefrontScreen`'s picker), not real coordinates, so
meters-level enter/exit geofencing isn't achievable honestly without also building a map/
coordinate picker — flagged to the user, who chose the state-level approximation. Detects
the customer's nearest state via `expo-location`'s foreground permission + one-shot
`getCurrentPositionAsync`, surfaces a "Near You" sort option on `StorefrontDirectoryScreen`
(only shown once detection succeeds — silently absent otherwise, e.g. permission denied or
the sandboxed web preview, which can't grant geolocation without a real user gesture; verified
live that this fails gracefully with no crash and no phantom sort option).

**Not done this pass (see Native guide.txt's updated headings 4 & 5 for the itemized status):**
ESC/POS Bluetooth printer integration and true background geofencing — both explicitly
skipped as too hardware-dependent to build without real hardware to test against. Biometric
quick login, swipe-to-action order cards, glassmorphic design system — not started. The user
also added three new items directly into `Native guide.txt` mid-session (monochrome icons
project-wide except the toolbar, full responsive/split-screen support, and a primary color
scheme change from blue to green/emerald) — flagged back to the user rather than guessed at,
since the exact palette and icon-audit scope are real decisions, not implementation details.

### 2026-08-31 (session 7) — Push notifications, Terms/Privacy, crash reporting, EAS build profiles

Closes out the four items deferred at the end of session 6. `npx tsc --noEmit` clean
throughout; verified live via `expo start --web` (see per-item notes below).

**Push notifications (client-side plumbing only — no backend in this repo to send from).**
Installed `expo-notifications`, `expo-device`, `expo-constants`. New
`src/utils/pushNotifications.ts`: `registerForPushNotificationsAsync()` requests permission,
skips entirely on non-physical devices (`Device.isDevice`) and when no EAS project is
configured yet (`Constants.expoConfig?.extra?.eas?.projectId` unset — see `eas.json` below),
then calls the existing `registerPushToken` endpoint (was already in `api.ts`/`demoEngine.ts`
as a demo no-op, unused until now). `setNotificationHandler` configured with the *current*
SDK 57 fields (`shouldShowBanner`/`shouldShowList`) — the older `shouldShowAlert` field was
deprecated; confirmed against live docs before writing this, per this file's standing rule.
Wired into `App.tsx`: a `useEffect` keyed on `appState` calls it once the user is actually
`'admin'` or `'customer'`, never during `'loading'`/`'logged_out'`. `expo-notifications` added
to `app.json`'s plugins. Verified live: web bundle logs the expected (harmless)
`[expo-notifications] Listening to push token changes is not yet fully supported on web`
warning and does not crash — a real device build is required to exercise the actual token
flow, which isn't testable from this environment.

**Terms of Service / Privacy Policy.** New `TermsOfServiceScreen.tsx` / `PrivacyPolicyScreen.tsx`
(`src/screens/(auth)/`) with drafted content scoped to what this app actually does (vendor/
customer account types, direct-to-vendor payments, Access Page guest data, no GPS collection
— the storefront "location" field is self-selected, not geolocated). Registered in
`AuthNavigator` with visible headers/back buttons. `RegisterScreen` gained a required
"I agree to the Terms of Service and Privacy Policy" checkbox with tappable links to both
screens; `Create Account` is disabled until checked, and submitting without it shows an error
rather than silently proceeding. Verified live: checkbox renders unchecked by default, the
Terms link navigates and back-navigates correctly, content is fully scrollable.

**Crash reporting scaffold (Sentry).** Installed `@sentry/react-native`. New
`src/utils/crashReporting.ts` calls `Sentry.init` at module load (side-effect import, first
line of `App.tsx`, before any component code runs) with `dsn: process.env.EXPO_PUBLIC_SENTRY_DSN`
and `enabled: !!dsn` — deliberately explicit rather than relying on Sentry's own empty-DSN
handling, so the disabled state is unambiguous in this codebase. `App.tsx`'s root component
is now wrapped with `Sentry.wrap()` before being exported. `metro.config.js` swapped
`expo/metro-config`'s `getDefaultConfig` for `@sentry/react-native/metro`'s
`getSentryExpoConfig` (a drop-in replacement, still wrapped by `withNativeWind` on top) so
source maps upload correctly on a real build. `app.json` gained the
`@sentry/react-native/expo` config plugin with placeholder `organization`/`project` values
that **must be replaced with a real Sentry project before EAS builds run**; `npx expo
install` also auto-appended a redundant bare `"@sentry/react-native"` plugin entry, which was
removed since the `/expo` sub-path entry already covers it. `.env.example` documents both
`EXPO_PUBLIC_SENTRY_DSN` (not secret, safe to embed client-side, left blank so local dev
never reports to a real project) and `SENTRY_AUTH_TOKEN` (a real secret, build-time only for
source-map upload — must go in `.env.local`/CI secrets, never `EXPO_PUBLIC_`-prefixed).
Verified live: web console shows `Sentry Logger [warn]: No DSN provided, client will not
send events` — confirms it initializes without crashing and stays inert exactly as intended
until a real DSN is set.

**`eas.json` build profiles.** `development` (dev client, internal distribution),
`preview` (internal distribution, staging API placeholder), `production`
(`autoIncrement: true`, production API placeholder). Each profile sets its own
`EXPO_PUBLIC_API_BASE` via `env`, mirroring the existing `.env`/`.env.local` convention —
**the `preview`/`production` API URLs are placeholder domains and must be replaced with real
backend URLs before running an actual EAS build.**

### 2026-08-31 (session 6) — Services menu, Access Page subsystem, Storefront Directory, Product Catalog Editor

Closes out the scope note left at the bottom of session 5's entry (Nigeria location dropdown,
Services menu, Access Page, customer/vendor storefront directory, Product Catalog Editor were
explicitly deferred there). `npx tsc --noEmit` is clean throughout.

**Data layer built first, screens on top of it.** `demoEngine.ts` gained: `createProduct`/
`updateProduct`/`deleteProduct`, `getAllStorefronts` (published-only — deliberately distinct
from the existing `getMyStorefronts`, which is vendor-scoped), `getStorefrontRatings`
(aggregates a new `feedbacks` store, seeded with 4 demo entries across 3 storefronts), and the
full Access Page CRUD + guest check-in (`getAccessPages`, `createAccessPage`,
`updateAccessPage`, `deleteAccessPage`, `getAccessPageBySlug`, `submitAccessPageGuestEntry`,
`getAccessPageGuests`). `resetDemoState()`/`init()` updated to cover the three new stores
(`feedbacks`, `accessPages`, `accessPageGuests`) so a demo reset doesn't leave them stale.
`createStoreFeedback` — previously a pure no-op `Promise.resolve({id: Date.now()})` — now
actually persists into the feedbacks store, since the new ratings aggregation depends on it.

**Five new screens**, matching the existing `EventsManagerScreen`-style conventions
(`useFocusRefresh`, `cn()`, lucide icons, NativeWind className throughout):
- `ServicesScreen` — Create/Add Storefront card (label depends on whether the vendor already
  has ≥1 storefront) + Access Page card (single storefront → navigates straight through;
  multiple → inline picker).
- `ProductCatalogEditorScreen` — product CRUD, single-image upload (same
  `expo-file-system/legacy` `uploadAsync` pattern `CreateStorefrontScreen` already used),
  delist/relist toggle. Wired into `DashboardScreen`'s per-storefront ops row.
- `AccessPageManagerScreen` — event type picker (Custom/Wedding/Conference/Concert); the three
  presets auto-populate a fixed field set, Custom starts blank with a one-field-at-a-time
  builder (text/number/date/yesno/dropdown, required flag, dropdown options). Shareable slug
  copy-to-clipboard, active/inactive toggle, expandable guest list.
- `AccessPageGuestScreen` — public, unauthenticated guest form + check-in, reveals
  `exclusiveContent` on success. Registered in all three navigators (Auth/Admin/Customer) —
  deliberately not gated behind login, same reasoning as the anonymous QR-scan ordering flow.
- `StorefrontDirectoryScreen` — became `CustomerNavigator`'s initial route (the "screen after
  successful login" for customers), also reachable from `DashboardScreen`'s new Compass icon
  for vendors. Lists all published storefronts, sortable by rating/location/alphabetical;
  a vendor's own storefronts render pinned above the full list.

**Nigeria location picker** — `@react-native-picker/picker` installed, `NIGERIA_STATES` (36
states + FCT) added to `types.ts`, wired into `CreateStorefrontScreen` as a required field,
persisted into `storefront.data.location` and read back via `parseStorefrontData` (which
gained a `location` field). Demo seed data (`mockData.ts`) given real locations (Lagos,
Abuja, Port Harcourt) so the directory's location sort has something to show immediately.

**Bug found and fixed during live verification, not just written blind:** `StorefrontDirectoryScreen`
is registered with a hidden native header in `AdminNavigator` (to match `DashboardScreen`'s
own custom-header pattern), but initially had no back button of its own — a vendor tapping
the Compass icon from Dashboard would land on the directory with **no way back**. Caught by
actually clicking through the flow in a live browser session, not by reading the code. Fixed
with a conditional `navigation.canGoBack()` back arrow in the screen's own header row.

**Verified live**, not just compiled: ran `expo start --web`, logged in as the demo Admin
account, and clicked through Dashboard → Compass (Directory, confirmed ratings/location/
vendor-pinned section, then the back-button fix) → LayoutGrid (Services, confirmed correct
Add-Storefront label since storefronts already existed, and the multi-storefront Access Page
picker) → Access Page Manager (confirmed the Wedding/Concert presets populate the exact field
sets defined in code). `ProductCatalogEditorScreen`/`AccessPageGuestScreen` weren't
interactively clicked through this pass (browser-tool click timeouts partway through the
session, unrelated to app code — screenshots/text reads kept working throughout) but share
the same tested API surface and screen conventions as what was verified.

**Still outstanding** (unchanged targets from session 5's deferral, not touched this pass):
push notification client plumbing (`expo-notifications`, `registerPushToken` wiring — the
`api.ts` endpoint already exists as a no-op in demo mode), Terms/Privacy screens + Register
checkbox, crash-reporting scaffold (Sentry), `eas.json` build profiles.

### 2026-08-19 (session 5) — Full NativeWind migration, back button, icon audit, demo-mode fix

**NativeWind installed and verified working end-to-end**, not just "compiles":
`nativewind@4.2.6`, `tailwindcss@3.4.19` (v3 — NativeWind requires it, not v4),
`react-native-reanimated@4.5.1` (pulled in as a peer dep; confirmed `babel-preset-expo`
auto-configures its babel/worklets plugin, no manual setup needed). Config: `tailwind.config.js`
(custom `primary` color only — the rest of the app's palette already matched Tailwind's
default gray/emerald/amber/red/indigo scales exactly, e.g. `#111827` = `gray-900`,
`#059669` = `emerald-600`), `babel.config.js`, `metro.config.js` wrapped with
`withNativeWind`, `global.css`, `nativewind-env.d.ts` (plus a `declare module '*.css'`
augmentation for the side-effect import in `App.tsx`), `app.json`'s `web.bundler: "metro"`.
Added `src/utils/cn.ts` (conditional className joiner, replaces the `[styleA, cond &&
styleB]` array pattern). Started a real dev server (`expo start --web`, cache cleared) and
confirmed via computed-style inspection that classes resolve to actual CSS (e.g. the Sign In
button computes `background-color: rgb(108, 99, 255)` from `bg-primary`) — not just a
successful bundle.

**All 26 files converted from `StyleSheet.create` to `className`** — every screen, every
shared component, `App.tsx`. Confirmed via `grep -rl "StyleSheet.create"` returning nothing.
`CustomButton`/`CustomInput` changed their public API from `style`/`textStyle`/
`containerStyle` props to `className`/`textClassName`/`containerClassName` — all call sites
updated in the same pass.

**Every emoji replaced with a `lucide-react-native` icon**, confirmed via a Unicode-range
grep (`[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}]`) returning zero matches project-wide.
Notable ones: the feedback star rating in `StorefrontToolbar` was a literal `"*"` character
lit up with color — now real `Star` icons with `fill`. `DevTestBanner` and
`ToolbarRequestsAdminScreen` had the heaviest concentration (role icons, tab icons, request
type icons). `StorefrontScreen`'s "no logo" placeholder was ASCII art (`"|=|"`) — now a
`Store` icon.

**`CameraQRScannerScreen` gained an explicit back button** — a floating `ArrowLeft` circle
top-left over the camera viewfinder, `navigation.goBack()`. Note: this screen already had a
native stack header with its own back arrow (`headerBackTitle: 'Back'` in `App.tsx`'s three
navigator registrations) — the floating button is an additional, more visible affordance
over the dark camera background, not a replacement. Verified live: renders with
`accessibilityLabel="Go back"` and correctly routes back.

**Demo-mode default bug actually fixed this time.** Session 3's fix only changed `api.ts`'s
*initial* `ENABLE_DEMO_MODE` value to `__DEV__` — but `demoEngine.init().then(() =>
{ ENABLE_DEMO_MODE = demoEngine.isDemoModeEnabled(); })` immediately overwrites that with
`demoEngine`'s own internal `demoModeEnabled` field, which was still hardcoded `true`
regardless of `__DEV__` or any persisted choice. Net effect: a production build's fresh
install would briefly start in live mode, then flip itself into demo mode moments later.
Fixed `demoEngine.ts`'s field default to `__DEV__` too, so both halves of this handshake
now agree.

**New vendor/customer registration split** (added while converting `RegisterScreen`):
`register()` in `api.ts` now takes a required `role: 'vendor' | 'customer'` param, sent to
the backend in live mode. `RegisterScreen` gained a role toggle (Vendor/Customer, each with
an icon) above the form. Demo mode's `register()` mock still just returns a canned success
message regardless of role — demo registration was never wired to create real distinct
accounts beyond the two fixed `DEMO_ACCOUNTS`, so this is an existing limitation, not a
regression.

**Scope note:** the Nigeria location dropdown, Services menu (Create/Add Storefront + Access
Page cards), customer storefront directory with ratings aggregation, and vendor-pinned-above
list were part of an earlier pivot message but were **not** included in this pass — this
session's explicit instructions were back button + icon audit + finish NativeWind + demo-mode
fix, in that order. Those remain outstanding.

### 2026-08-19 (session 4) — Codebase-wide trim/optimize pass

Requested after session 3's fix pass: reduce duplication, remove dead code, and improve
runtime efficiency across the whole project. `npx tsc --noEmit` clean throughout; also ran
`npx tsc --noEmit --noUnusedLocals --noUnusedParameters` project-wide to surface every dead
import/variable/param in one shot rather than hunting file by file — recommend doing this
again after any future large batch of changes, it's far cheaper than manual review.

**Wired up `CustomButton`/`CustomInput` — previously dead components, zero usages anywhere.**
Both matched the auth screens' hand-rolled input/button styling almost exactly (down to the
same hex colors), suggesting they were built for this purpose and never actually wired in.
Replaced the duplicated label+TextInput and TouchableOpacity+ActivityIndicator blocks in
`LoginScreen`, `RegisterScreen`, `ForgotPasswordScreen`, and (for its submit button only —
the OTP digit input is too specialized to genericize) `VerifyOtpScreen`. Net effect: four
screens shorter, one consistent input/button implementation instead of four copies to keep
in sync, and two components that now actually justify existing. Also removed a dangling
unused `CustomButton` import in `CameraQRScannerScreen.tsx` that was never wired to anything.

**`StorefrontScreen`'s product list: `ScrollView` + `.map()` → `FlatList`.** The menu list
was rendering every product unconditionally regardless of scroll position — real
virtualization now means only visible rows mount. Section title moved to
`ListHeaderComponent`, the "no products" message to `ListEmptyComponent`. Confirmed this
doesn't trigger React Native's nested-VirtualizedList warning — the horizontal category
scroller is a separate, unrelated `ScrollView`, not wrapping the product list.

**Extracted `src/hooks/useFocusRefresh.ts`** — replaces the identical
`useFocusEffect(useCallback(() => { load(); }, [load]))` boilerplate that was duplicated
verbatim across `DashboardScreen`, `LiveOrdersManagerScreen`, `EventsManagerScreen`, and
`ToolbarRequestsAdminScreen`. (`OrderReceiptTrackerScreen`'s `useFocusEffect` sets up a
polling interval with real cleanup logic — genuinely different, left as-is rather than
forced into the same hook.)

**Dead code removed, found via the strict unused-locals pass:**
- `ActivateQRScreen.tsx`: `txRef` state was set but its value never read anywhere (the
  actual reference flows through a closure variable instead) — removed the state entirely.
- `CreateStorefrontScreen.tsx`: unused `useRef` import; a computed-but-never-used `ext`
  file-extension variable in `uploadImageToBackend` (and the `filename` var that only fed
  it) — removed as dead rather than guessing what it was meant to wire into.
- `CartDrawerScreen.tsx`: `isDeliveryEnabled` state was declared `useState(true)` and read,
  but its setter was never called anywhere — meaning it could never become anything but
  `true`. Removed the flag entirely; `appliedDelivery` now derives purely from
  `subtotal > 0`, matching how `CheckoutScreen` already does the same calculation.
  (`StorefrontScreen` has the same always-true pattern but its setter genuinely is called —
  just always with `true` — so it wasn't flagged as dead code; left alone since "fixing" it
  would mean inventing a `deliveryEnabled` config field that doesn't exist on the backend.)
- `DashboardScreen.tsx`: unused `CommonActions` import (leftover from before `useFocusRefresh`
  replaced the manual `useFocusEffect`/`useCallback` pairing).
- `OrderReceiptTrackerScreen.tsx`: unused `useEffect` import.
- `StorefrontScreen.tsx`: an entire unused `SAMPLE_CATEGORIES` placeholder array — categories
  are (and always were) computed live from the fetched product list instead.
- `demoEngine.ts`'s `verifyStoreTable`: unused `storefrontId` param, prefixed `_storefrontId`
  rather than removed (must stay in the signature to match the real API's shape).
- `mockData.ts`: unused `AuthResponse`/`MeResponse` type imports.
- Several screens (`LiveOrdersManagerScreen`, `SplashScreen`, `CameraQRScannerScreen`) had
  an unused `navigation` or `route` prop destructured for no reason — trimmed to just what's
  used.

**Not touched, deliberately:** the ~25 "`'React' is declared but its value is never read`"
warnings across nearly every screen. This project's JSX transform doesn't require the
explicit import, but it's an existing, harmless, whole-codebase convention — removing it
project-wide would be pure churn for zero runtime benefit, not an optimization.

### 2026-08-19 (session 3) — Cleared the full open-issues list (16 items) before starting new screens

User asked for a plan + clarifying questions before touching code (answers: anonymous-only
customer access in live mode; env-var scaffold for API config; unified
PENDING→CONFIRMED→COMPLETED(+REJECTED/CANCELLED) order lifecycle; demo mode requires login
but gets a quick test-account button). `npx tsc --noEmit` clean throughout.

**Currency:** `LiveOrdersManagerScreen.tsx` used `$`/`.toFixed(2)` in a Naira-based app —
fixed to `₦`/`.toLocaleString()`, including the mock test-order generator's dollar-style
decimal prices.

**Anonymous customer entry point (the big one):** Answering "is customer access ever
login-based" with "anonymous only" exposed that `AuthNavigator` (shown whenever
`appState === 'logged_out'`) had *no route at all* to `CameraQRScanner`/`Storefront` —
customers had no way to reach the app in live mode. Added the full customer flow
(`CameraQRScanner`, `Storefront`, `Wishlist`, `CartDrawer`, `Checkout`,
`OrderReceiptTracker`) to `AuthNavigator`, and added a "📷 Scan a Table QR Code" button to
`LoginScreen`, above a divider from the merchant sign-in form.

**Demo-mode role bug, found while implementing the above:** `LoginScreen`'s `handleLogin`
unconditionally called `setAppState('admin')` regardless of which account actually logged
in — so typing a demo "customer" email still landed on the Admin dashboard. Fixed to check
`res.roles.includes('ROLE_MERCHANT')`. Correct for both modes: in live mode only merchants
use this form at all (customers use the anonymous QR flow instead), and in demo mode it now
respects whichever account was actually used.

**Demo default role + quick login:** `demoEngine`'s default `activeRole` changed from
`'admin'` to `'logged_out'` — a fresh demo install now goes through Login like a real app
would. Added a demo-mode-only "🧪 Quick Login" section on `LoginScreen` (Admin/Customer
buttons using the real seeded `DEMO_ACCOUNTS` emails) so this doesn't cost testing
convenience — it's a real login through the normal flow, not a bypass.

**Web token storage:** `saveToken`/`getToken`/`deleteToken` called `expo-secure-store`
unconditionally, which has no web implementation. Generalized the previously-unused
`saveSecureData` helper into `setSecureItem`/`getSecureItem`/`deleteSecureItem`, branching
on `Platform.OS === 'web'` → `AsyncStorage`.

**Global session-expiry handling:** Added `onUnauthorized(listener)` to `api.ts` — a tiny
pub/sub that `request()` fires on any `401`. `App.tsx` subscribes once at the top level
(logs out + resets `appState`), replacing `DashboardScreen`'s fragile
`msg.includes('401')` string-matching, which only covered that one screen anyway.

**`request()` no longer breaks on empty/204 responses:** Was unconditionally calling
`res.json()`; now reads `res.text()` first and only parses if non-empty
(`parseJsonBody` helper), fixing the several `Promise<void>`-typed endpoints
(acknowledge/PATCH calls) that would have thrown against a real backend.

**Prod API config scaffold:** `API_BASE` moved to `process.env.EXPO_PUBLIC_API_BASE`
(falls back to the local LAN IP for dev). Added `.env` (committed default — not secret,
Expo bundles `EXPO_PUBLIC_*` into the client regardless) and `.env.example` documenting
`.env.local` as the override path. `ENABLE_DEMO_MODE` now defaults to `__DEV__` instead of
hardcoded `true`; `DevTestBanner` on `DashboardScreen` is now `{__DEV__ && <DevTestBanner
/>}`.

**Order-status lifecycle unified** to `PENDING → CONFIRMED → COMPLETED` (+
`REJECTED`/`CANCELLED`), dropping `PREPARING`: seed data's one `PREPARING` order recast to
`CONFIRMED`; `LiveOrdersManagerScreen` gained a `COMPLETED` tab and a "Mark Completed"
action on confirmed orders (there was previously no way to ever reach `COMPLETED` from the
admin UI); `OrderReceiptTrackerScreen`'s terminal-status set now excludes `CONFIRMED`
(polling continues until `COMPLETED`/`REJECTED`/`CANCELLED` — confirmed is "in progress,"
not settled); `StatusBadge` gained a `COMPLETED` case (was falling through to the same
default styling as an unmatched status).

**`ActivateQRScreen` verification bug, found while removing an `any` cast:** was casting
`verifyPayment`'s result to `any` and checking `res.paid || res.status === 'SUCCESSFUL' ||
res.status === 'success'` — but `PaymentVerifyResponse` only has `{ verified, createdSlug
}`. Those fields never existed, so the condition was always false: **QR activation via
demo payment always reported "verification incomplete," even on success.** Fixed to check
`res.verified` with the cast removed.

**Other `any` cleanup:** `CreateStorefrontScreen`'s two `catch (e: any)` → `catch (e:
unknown)` with proper narrowing. `CheckoutScreen`'s `(sf.data as any)?.bankName` replaced
by extracting `StorefrontScreen.tsx`'s existing `isRecord`/`parseStorefrontData` into a
shared `src/utils/parseStorefrontData.ts` (both screens now import it — this also means
there's only one place that knows the shape of a storefront's free-form `data` JSON blob).

**Redundant slug removed:** `CreateStorefrontScreen` no longer sends a client-computed
`data.slug` — confirmed unused downstream (`parseStorefrontData` never reads it); the
backend/`demoEngine` generates the canonical slug itself. The now-dead `createSlug` helper
was removed too.

**Housekeeping:** `metro.config.js` was a genuinely empty file — now exports
`getDefaultConfig(__dirname)` as it should. `expo-blob` (zero references anywhere)
uninstalled. Dead commented-out code removed from `RegisterScreen.tsx` and
`SplashScreen.tsx`. `app.json` gained `"scheme": "scancode"` so the Paystack
`scancode://payment-complete` redirect has something to resolve against (native
prebuild/standalone builds only — Expo Go can't honor custom schemes).

**Deliberately not changed:** demo mode still accepts any password (it's mock data; faking
a check adds no real security) — flagged to the user, no objection raised.

### 2026-08-19 (session 2) — Dedicated Wishlist/Cart screens, 2 new roadmap screens, VAT bug fix, expo-audio migration

Continuation of the same day's work, covering: promoting Wishlist/Cart to real screens, building
the next two roadmap screens (`OrderReceiptTrackerScreen`, `EventsManagerScreen`), auditing and
fixing the VAT bug, migrating off `expo-av`, and verifying weekly-events storefront isolation.
`npx tsc --noEmit` is clean (exit 0) after every step below.

**1. New shared domain types (`src/types.ts`)**
- Moved `Vendor`, `Product`, `CartItem` (previously locally defined/exported from
  `StorefrontScreen.tsx`) and `DayOfWeek`, `DAYS_OF_WEEK`, `DayEvent`, `WeeklyEvents`
  (previously locally defined in `StorefrontToolbar.tsx`) into `types.ts`. Both files now
  import (and re-export, for backward compatibility with existing imports) from there. This
  was necessary to avoid a circular import once `CartContext` needed `CartItem`/`Product`.
- Tightened `RootStackParamList.Checkout.cart` from `any[]` to `CartItem[]`.
- Added routes: `Wishlist`, `CartDrawer`, `OrderReceiptTracker`, `EventsManager`.

**2. `CartContext` (`src/context/CartContext.tsx`) — new**
- Cart and favorites are `Record<storefrontId, T[]>`, not flat arrays — deliberately, so a
  customer who scans two different stores in one session doesn't see store A's cart bleed
  into store B's. `CartItem` now carries an optional `stock` snapshot (captured at
  add-to-cart time) so quantity limits can be enforced from screens that don't have the full
  product catalog loaded (e.g. `CartDrawerScreen`).
- Mounted via `<CartProvider>` in `App.tsx`, wrapping both the Admin and Customer navigators
  (both stacks register Storefront/Checkout-family screens, so the provider has to sit above
  both).

**3. `WishlistScreen.tsx` / `CartDrawerScreen.tsx` — new, promoted from `StorefrontScreen`'s modals**
- These were previously in-screen `<Modal>` popups inside `StorefrontScreen.tsx`. Now real
  routed screens reading/writing through `CartContext`, registered in both `AdminNavigator`
  and `CustomerNavigator` (Storefront is previewable from the admin side too).
- `CartDrawerScreen` independently fetches store config (VAT/delivery) via `getStoreConfig`
  rather than receiving it through route params, so it works correctly even if reached some
  way other than "tap the cart bar on Storefront."
- `StorefrontScreen.tsx` lost ~200 lines (both modals + their dead styles) and now just
  navigates to these on cart/heart icon taps. Also removed a **dead, incorrectly-shaped
  local `RootStackParamList`/`StorefrontScreenRouteProp` shadow type** that didn't match the
  real registered route name (`'Storefront'`, not `'StorefrontScreen'`) — it happened to work
  because `useRoute<T>()`'s generic isn't runtime-validated, but it was a landmine. Now uses
  the real `NavigationProp<'Storefront'>`/`RouteProps<'Storefront'>` from `types.ts`.

**4. `CheckoutScreen.tsx` — clears cart on success, hands off to order tracking**
- Calls `clearCart(storefrontId)` after a successful `createOrder`, so returning to the
  Storefront shows an empty cart instead of stale items (previously the cart lived in
  `StorefrontScreen`'s own state and simply wasn't touched by checkout at all).
- Success screen now offers "Track Order Status" (→ `OrderReceiptTracker`) as the primary
  action, with "Return to Storefront" demoted to secondary.
- Also deduplicated `loadStorefrontData()`, which previously called `getStorefrontBySlug(slug)`
  twice (once in each branch of an `if (!activeStoreId)`) for no reason.

**5. `OrderReceiptTrackerScreen.tsx` — new (roadmap item)**
- Customer-facing order status screen. Polls `getOrderById(storefrontId, orderId)` (new
  endpoint, mirrors `getOrders`) every 5s via `useFocusEffect`, stops polling once the order
  reaches a terminal status (`CONFIRMED`/`REJECTED`/`CANCELLED`/`COMPLETED`), plays a chime on
  status change. Uses a ref for the "should I keep polling" check rather than a `useEffect`
  dependency on `order.status`, to avoid a redundant duplicate fetch on first load that an
  earlier draft of this had.

**6. `EventsManagerScreen.tsx` — new (roadmap item)**
- Admin CRUD for a storefront's weekly events (previously read-only hardcoded demo data).
  Backed by new `getStorefrontEvents(storefrontId)` / `updateStorefrontEvents(storefrontId,
  weeklyEvents)` in `api.ts` + `demoEngine.ts`, which read/write the specific storefront
  record's own `data.weeklyEvents` field — verified (grepped every read/write site) that
  events are strictly isolated per `storefrontId` everywhere, with no shared/global state.
  This directly answers the "ensure weekly events are specific to the marketer/storefront
  that crafted it" item from the trailing task list — it was already correctly isolated by
  construction; this just adds the missing CRUD UI on top.
- Wired into `DashboardScreen`'s per-storefront ops row (📅 Events, alongside Orders/
  Activity/Config).

**7. VAT bug — found and fixed (root cause, not just a patch)**
- `StoreConfigResponse.vatRate`'s representation was inconsistent: `StoreChargesConfigScreen`
  always *saves* it as a fraction (e.g. `0.075`), but the demo seed data
  (`DEMO_STORE_CONFIGS` in `mockData.ts`) and `demoEngine.getStoreConfig`'s
  never-configured-yet fallback both *returned* a raw percent number (`7.5`).
  `StorefrontScreen.tsx` and the new `CartDrawerScreen.tsx` both defensively normalize
  (`rate > 1 ? rate / 100 : rate`) before use — but `CheckoutScreen.tsx` didn't, so on any
  storefront using default/seeded config, checkout computed VAT as **750% of subtotal**
  instead of 7.5% (visibly: the VAT line would have read "VAT (750.0%)").
- Fixed at the source: seed data and the fallback now both return `0.075`. Added the missing
  normalization guard to `CheckoutScreen.tsx` (matching the existing pattern elsewhere, for
  consistency rather than inventing a third approach). Documented the canonical
  fraction-not-percent representation directly on `StoreConfigResponse.vatRate` and
  `UpdateStoreConfigBody.vatRate` in `api.ts` so this can't silently drift back.

**8. `expo-av` → `expo-audio` migration**
- Rewrote `src/utils/audioAlert.ts` against the confirmed `expo-audio` v57 API (fetched live
  docs — see "Confirmed SDK 57 facts" above). Replaced the try/catch `require('expo-av')`
  native-module probing with a static `expo-audio` import; replaced `Audio.Sound.createAsync`
  + `setOnPlaybackStatusUpdate` with `createAudioPlayer(uri)` +
  `player.addListener('playbackStatusUpdate', ...)` for auto-release on finish.
- Removed the old always-fall-back-to-synth-on-web branch: `expo-audio` has real web support,
  so custom admin-uploaded tones now actually play on web instead of silently no-op'ing there.
- Installed `expo-audio` (`npx expo install expo-audio`, SDK-57-matched) and uninstalled the
  now-fully-dead `expo-av` dependency (`npm uninstall expo-av`) — confirmed via grep that no
  file imports it anymore before removing it.

**Still open (unchanged from before, not touched this pass):**
- Token storage broken on web (`SecureStore` called unconditionally).
- Live-mode login always routes to `'admin'`, never `'customer'`.
- `API_BASE` hardcoded to a local HTTP IP; `ENABLE_DEMO_MODE` defaults to `true` in source;
  `DevTestBanner` renders unconditionally on the Dashboard.
- `expo-blob` is still an unused dependency.
- The two order-status vocabularies noted in the previous entry are still unreconciled.

### 2026-08-19 — Fixed Clipboard crash + wired Live Orders to real data

**1. `StorefrontToolbar.tsx` — broken Clipboard import (confirmed runtime bug)**
- Was `import { Clipboard } from 'react-native'` — removed from RN core since 0.64, so
  `handleCopyAccount` would throw on native the moment a customer tapped "Tap to copy" on
  the vendor bank account number.
- Fixed: `import * as Clipboard from 'expo-clipboard'`, simplified `handleCopyAccount` to
  `await Clipboard.setStringAsync(...)`, dropped the now-dead `Platform.OS === 'web'`
  branch and the now-unused `Platform` import.
- Added `expo-clipboard` as a project dependency (installed via `npx expo install
  expo-clipboard`, resolved to `~57.0.1` — SDK-57-matched).

**2. `LiveOrdersManagerScreen.tsx` — never fetched real orders (confirmed data bug)**
- Was rendering a hardcoded `MOCK_INITIAL_ORDERS` array; orders placed through the real
  checkout flow (`CheckoutScreen` → `createOrder` → `demoEngine`) never appeared here.
- Added `updateOrderStatus(storefrontId, orderId, status)` to `src/api.ts` and
  `demoEngine.ts` (mirrors the existing `acknowledgeWaiterCall`/`acknowledgeStoreRequest`
  pattern) — needed so admin confirm/reject actions persist instead of reverting on the
  next fetch.
- `LiveOrdersManagerScreen.tsx` now fetches via `getOrders(storefrontId)` on focus (and on
  pull-to-refresh) using `useFocusEffect`, maps `OrderResponse` → the screen's `LiveOrder`
  shape (`mapOrder`/`parseOrderItems` helpers), and calls `updateOrderStatus` before
  applying a Confirm/Reject/Cancel action locally.
- Removed `MOCK_INITIAL_ORDERS` and the unused `CustomButton` import (pre-existing dead
  import, unrelated to this fix, cleaned up while already in the file).
- **Known follow-up, not fixed here:** the app has two different order-status vocabularies
  — checkout/demo orders use `PENDING` / `PREPARING` / `COMPLETED`, while this screen's tabs
  only filter `ALL` / `PENDING` / `CONFIRMED` / `REJECTED`. Widened `LiveOrder.status` to
  `string` so real data isn't dropped or miscast, but `PREPARING`/`COMPLETED` orders (only
  present in the seeded demo data, never produced by checkout) will only show under the
  "ALL" tab today. Reconciling the two status vocabularies is a separate, larger decision —
  flagging it rather than papering over it.
- The "⚡ Test Alarm" / trigger-test-order button and sound/tone controls are unchanged —
  they're explicit local-only demo utilities, not part of the real data path.

**Verified:** `npx tsc --noEmit` runs clean (exit 0) across the whole project after these
changes — no type regressions introduced.

**Not yet fixed (see prior analysis, still open):**
- Token storage broken on web (`SecureStore` called unconditionally; unused `AsyncStorage`
  fallback already exists in `api.ts` but nothing calls it).
- Live-mode login always routes to `'admin'`, never `'customer'` (`App.tsx`,
  `SplashScreen.tsx`).
- `API_BASE` hardcoded to a local HTTP IP; `ENABLE_DEMO_MODE` defaults to `true` in source;
  `DevTestBanner` renders unconditionally on the Dashboard — none of this is gated behind
  `__DEV__` or env config.
- `expo-blob` is an unused dependency (confirmed via grep — zero references in `src/`).
