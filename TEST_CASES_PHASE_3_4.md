# Test Cases: Phase 3 & 4 - Exercise Library & Workout Builder

## Test Environment Setup

**Prerequisites:**
1. Clear localStorage: `localStorage.clear()` in browser console
2. Refresh the app to load fresh sample data
3. Navigate to Coach Dashboard

---

## Phase 3: Exercise Library - Test Cases

### TC-001: First-Time User Onboarding

**Objective:** Verify onboarding screen appears for new users

**Steps:**
1. Clear localStorage
2. Refresh app and login as coach
3. Navigate to exercise library (if auto-shown, skip to step 4)
4. Observe onboarding screen

**Expected Results:**
- ✅ Onboarding screen displays with 🏋️ icon
- ✅ "Build Your Exercise Library" title visible
- ✅ "Load 25 Common Exercises" button with lightning icon
- ✅ "Add Exercise" button visible
- ✅ "Skip for now" link visible

**Pass/Fail:** ____

---

### TC-002: Quick-Start Load Common Exercises

**Objective:** Verify quick-start loads 25 exercises correctly

**Steps:**
1. From onboarding screen, click "⚡ Load 25 Common Exercises"
2. Wait for exercises to load
3. Navigate to exercise library

**Expected Results:**
- ✅ 25 exercises created (count displayed in header)
- ✅ Exercises grouped by category:
  - Upper Body: 8 exercises
  - Lower Body: 8 exercises
  - Core: 4 exercises
  - Cardio: 3 exercises
  - Mobility: 2 exercises
- ✅ Each exercise has proper equipment assigned
- ✅ Default sets = 3 or 4 for strength exercises
- ✅ Some exercises have coaching notes

**Pass/Fail:** ____

---

### TC-003: Quick-Start - Duplicate Prevention

**Objective:** Verify can't load common exercises twice

**Steps:**
1. Load common exercises (if not already loaded)
2. Clear exercises from library
3. Return to onboarding
4. Click "Load Common Exercises" again
5. Check if duplicates created

**Expected Results:**
- ✅ No duplicate exercises created
- ✅ Only 25 unique exercises exist
- ✅ Each exercise name appears once

**Pass/Fail:** ____

---

### TC-004: Manual Exercise Creation - Valid Data

**Objective:** Create exercise with valid data

**Steps:**
1. Click "+ Add Exercise" button
2. Fill form:
   - Name: "Barbell Deadlift"
   - Category: "Lower Body"
   - Equipment: "Barbell"
   - Default Sets: 4
   - Notes: "Keep back neutral, drive through heels"
3. Click "Add Exercise"

**Expected Results:**
- ✅ Modal closes
- ✅ New exercise appears in library
- ✅ Exercise appears under "Lower Body" category
- ✅ All fields saved correctly
- ✅ Usage count = 0
- ✅ Created/updated timestamps present

**Pass/Fail:** ____

---

### TC-005: Form Validation - Name Too Short

**Objective:** Validate minimum name length

**Steps:**
1. Click "+ Add Exercise"
2. Enter name: "AB" (2 characters)
3. Click in another field (trigger blur)
4. Observe error message

**Expected Results:**
- ✅ Error message: "Name must be at least 3 characters"
- ✅ Input field shows red border
- ✅ Cannot submit form

**Pass/Fail:** ____

---

### TC-006: Form Validation - Name Too Long

**Objective:** Validate maximum name length

**Steps:**
1. Click "+ Add Exercise"
2. Enter 51+ characters in name field
3. Observe character counter

**Expected Results:**
- ✅ Character counter shows "X/50"
- ✅ Input maxLength prevents typing beyond 50
- ✅ Error if exactly 51 characters entered

**Pass/Fail:** ____

---

### TC-007: Form Validation - Duplicate Name

**Objective:** Prevent duplicate exercise names

**Steps:**
1. Create exercise named "Barbell Bench Press"
2. Click "+ Add Exercise" again
3. Enter name: "barbell bench press" (different case)
4. Click in another field

**Expected Results:**
- ✅ Error message: "Exercise with this name already exists"
- ✅ Case-insensitive check (lowercase matches uppercase)
- ✅ Cannot submit form

**Pass/Fail:** ____

---

### TC-008: Form Validation - Invalid Sets

**Objective:** Validate sets range (1-10)

**Steps:**
1. Click "+ Add Exercise"
2. Try entering sets:
   - 0 sets
   - 11 sets
   - -5 sets

**Expected Results:**
- ✅ Error for 0: "Sets must be between 1 and 10"
- ✅ Error for 11: "Sets must be between 1 and 10"
- ✅ Error for negative: "Sets must be between 1 and 10"

**Pass/Fail:** ____

---

### TC-009: Form Validation - Notes Too Long

**Objective:** Validate notes max length (200 chars)

**Steps:**
1. Click "+ Add Exercise"
2. Enter 201 characters in notes field
3. Observe character counter and error

**Expected Results:**
- ✅ Character counter shows when >150 characters
- ✅ MaxLength prevents typing beyond 200
- ✅ Error if 201 characters entered

**Pass/Fail:** ____

---

### TC-010: Exercise Search Functionality

**Objective:** Search exercises by name

**Steps:**
1. Have at least 10 exercises in library
2. Type "bench" in search box
3. Observe filtered results

**Expected Results:**
- ✅ Only exercises with "bench" in name shown
- ✅ Case-insensitive search
- ✅ Real-time filtering (no submit needed)
- ✅ Count updates to show filtered count

**Pass/Fail:** ____

---

### TC-011: Search by Equipment/Notes

**Objective:** Search matches equipment and notes

**Steps:**
1. Type "barbell" in search
2. Observe results
3. Clear, type "elbows" (from notes)
4. Observe results

**Expected Results:**
- ✅ "barbell" matches equipment field
- ✅ "elbows" matches notes field
- ✅ All matching exercises displayed

**Pass/Fail:** ____

---

### TC-012: Category Filter

**Objective:** Filter exercises by category

**Steps:**
1. Click "Upper Body" category badge
2. Observe filtered exercises
3. Click "Lower Body"
4. Observe filtered exercises
5. Click "All" to clear filter

**Expected Results:**
- ✅ Only selected category exercises shown
- ✅ Selected badge highlighted (filled)
- ✅ Unselected badges outlined
- ✅ "All" shows all exercises
- ✅ Count accurate for each category

**Pass/Fail:** ____

---

### TC-013: Combined Search + Filter

**Objective:** Search and category filter work together

**Steps:**
1. Select "Upper Body" category
2. Type "press" in search

**Expected Results:**
- ✅ Only upper body exercises with "press" shown
- ✅ Both filters applied (AND logic)
- ✅ Results grouped correctly

**Pass/Fail:** ____

---

### TC-014: Edit Exercise

**Objective:** Update existing exercise

**Steps:**
1. Click edit icon (✏️) on any exercise
2. Change name to "Updated Exercise Name"
3. Change default sets to 5
4. Add note: "New coaching tip"
5. Click "Update Exercise"

**Expected Results:**
- ✅ Modal opens with pre-filled data
- ✅ Changes saved successfully
- ✅ Exercise updates in library immediately
- ✅ updatedAt timestamp updated
- ✅ Original ID preserved

**Pass/Fail:** ____

---

### TC-015: Edit - Duplicate Name Check

**Objective:** Cannot rename to existing exercise name

**Steps:**
1. Have 2+ exercises: "Exercise A" and "Exercise B"
2. Edit "Exercise A"
3. Try changing name to "Exercise B"
4. Observe error

**Expected Results:**
- ✅ Error: "Exercise with this name already exists"
- ✅ Cannot save with duplicate name
- ✅ Can keep original name (not flagged as duplicate)

**Pass/Fail:** ____

---

### TC-016: Delete Exercise - Unused

**Objective:** Delete exercise with 0 usage count

**Steps:**
1. Click delete icon (🗑️) on exercise with usageCount = 0
2. Observe confirmation dialog
3. Click "OK"

**Expected Results:**
- ✅ Confirmation: "Delete '[name]'? This cannot be undone."
- ✅ Exercise removed from library
- ✅ List updates immediately
- ✅ Category count decreases

**Pass/Fail:** ____

---

### TC-017: Delete Exercise - In Use

**Objective:** Delete exercise that's used in plans

**Steps:**
1. Manually set exercise usageCount > 0 (or use in a workout)
2. Click delete icon
3. Observe confirmation message
4. Confirm deletion

**Expected Results:**
- ✅ Warning message mentions usage count
- ✅ Message: "used in X workout(s)"
- ✅ Clarifies existing workouts unchanged
- ✅ Exercise deleted from library
- ✅ Existing workouts still have the exercise

**Pass/Fail:** ____

---

### TC-018: Grouped Display by Category

**Objective:** Exercises grouped and sorted properly

**Steps:**
1. Have exercises in multiple categories
2. View library with "All" filter

**Expected Results:**
- ✅ Exercises grouped by category
- ✅ Category headers show count: "Upper Body (8)"
- ✅ Each category collapsed into section
- ✅ Categories in logical order

**Pass/Fail:** ____

---

### TC-019: Empty State - No Exercises

**Objective:** Handle empty library gracefully

**Steps:**
1. Delete all exercises
2. Observe empty state

**Expected Results:**
- ✅ Message: "No exercises found."
- ✅ No error or crash
- ✅ "+ Add Exercise" button still accessible

**Pass/Fail:** ____

---

### TC-020: Empty State - Search No Results

**Objective:** Handle no search results

**Steps:**
1. Have exercises in library
2. Search for "zzzznonexistent"

**Expected Results:**
- ✅ Message: "No exercises found."
- ✅ "Clear search" link appears
- ✅ Clicking clears search and shows all

**Pass/Fail:** ____

---

### TC-021: Skip Onboarding

**Objective:** Can skip onboarding and add exercises later

**Steps:**
1. From onboarding, click "Skip for now"
2. Navigate elsewhere in app
3. Return to exercise library

**Expected Results:**
- ✅ Onboarding dismissed
- ✅ Empty library or direct to library page
- ✅ Can add exercises manually
- ✅ localStorage flag set to not show again

**Pass/Fail:** ____

---

### TC-022: Returning User - No Onboarding

**Objective:** Onboarding doesn't show for returning users

**Steps:**
1. Load common exercises or add manually
2. Refresh page
3. Navigate to exercise library

**Expected Results:**
- ✅ Goes directly to library page
- ✅ No onboarding screen
- ✅ Exercises persisted in localStorage
- ✅ All data intact

**Pass/Fail:** ____

---

### TC-023: Form Cancel - No Changes

**Objective:** Cancel doesn't save changes

**Steps:**
1. Click "+ Add Exercise"
2. Fill in some fields
3. Click "Cancel"

**Expected Results:**
- ✅ Modal closes
- ✅ No exercise added
- ✅ Library unchanged

**Pass/Fail:** ____

---

### TC-024: Form Cancel - Edit Mode

**Objective:** Cancel edit doesn't save changes

**Steps:**
1. Click edit on existing exercise
2. Change name and sets
3. Click "Cancel"
4. View exercise in library

**Expected Results:**
- ✅ Modal closes
- ✅ Changes not saved
- ✅ Original values preserved

**Pass/Fail:** ____

---

### TC-025: All Categories and Equipment

**Objective:** Verify all dropdown options work

**Steps:**
1. Create exercises with each category:
   - UPPER_BODY, LOWER_BODY, CORE, CARDIO, MOBILITY, OTHER
2. Create exercises with each equipment:
   - BARBELL, DUMBBELL, KETTLEBELL, BODYWEIGHT, MACHINE, CABLE, BANDS, OTHER

**Expected Results:**
- ✅ All categories selectable
- ✅ All equipment types selectable
- ✅ Exercises group correctly
- ✅ Labels display properly

**Pass/Fail:** ____

---

## Phase 4: Workout Builder - Test Cases

### TC-101: Multi-Select Exercise Picker - Open

**Objective:** Enhanced picker opens and displays exercises

**Steps:**
1. Open PlanBuilder for a workout
2. Click "+ Add Exercise" button
3. Observe picker modal

**Expected Results:**
- ✅ Modal opens with title "Add Exercises to Workout"
- ✅ Search bar visible
- ✅ Category and equipment filters visible
- ✅ Exercise list displays with checkboxes
- ✅ "Select All" button visible
- ✅ Footer shows "Add Selected (0)"

**Pass/Fail:** ____

---

### TC-102: Multi-Select - Select Multiple

**Objective:** Can select up to 20 exercises

**Steps:**
1. Open exercise picker
2. Check 3 exercises
3. Observe selected count
4. Check 17 more (total 20)
5. Try checking 21st

**Expected Results:**
- ✅ Each checked exercise highlighted
- ✅ Footer updates: "Add Selected (3)"
- ✅ Can select up to 20
- ✅ 21st checkbox disabled or shows error
- ✅ Message: "Max 20 exercises per selection"

**Pass/Fail:** ____

---

### TC-103: Multi-Select - Select All

**Objective:** "Select All" selects visible exercises

**Steps:**
1. Filter to category with <20 exercises
2. Click "Select All"
3. Observe selections

**Expected Results:**
- ✅ All visible exercises checked
- ✅ Count shows total selected
- ✅ If >20 visible, only first 20 selected

**Pass/Fail:** ____

---

### TC-104: Multi-Select - Add to Workout

**Objective:** Selected exercises added to workout

**Steps:**
1. Select 5 exercises
2. Click "Add Selected (5)"
3. Observe workout

**Expected Results:**
- ✅ Modal closes
- ✅ All 5 exercises appear in workout
- ✅ Each has default sets from library
- ✅ Exercise order preserved
- ✅ Exercise IDs unique

**Pass/Fail:** ____

---

### TC-105: Picker Search

**Objective:** Search filters exercise list

**Steps:**
1. Type "bench" in search box
2. Wait 300ms (debounce)
3. Observe filtered results

**Expected Results:**
- ✅ Only matching exercises shown
- ✅ Debounced (not instant)
- ✅ Case-insensitive
- ✅ Checkboxes still functional

**Pass/Fail:** ____

---

### TC-106: Picker Category Filter

**Objective:** Category filter works in picker

**Steps:**
1. Select "Upper Body" from dropdown
2. Observe filtered exercises
3. Select "All"

**Expected Results:**
- ✅ Only upper body exercises shown
- ✅ Filter dropdown updates
- ✅ "All" shows all exercises again

**Pass/Fail:** ____

---

### TC-107: Picker Equipment Filter

**Objective:** Equipment filter works in picker

**Steps:**
1. Select "Barbell" from equipment dropdown
2. Observe filtered exercises

**Expected Results:**
- ✅ Only barbell exercises shown
- ✅ Equipment dropdown updates
- ✅ Can combine with category filter (AND logic)

**Pass/Fail:** ____

---

### TC-108: Workout Sidebar - Navigation

**Objective:** Sidebar shows all workouts with status

**Steps:**
1. Open PlanBuilder
2. Observe sidebar (left side, 30% width)
3. View workout list

**Expected Results:**
- ✅ Sidebar fixed, scrollable
- ✅ All weeks listed
- ✅ All workouts under each week
- ✅ Current workout highlighted with "→"
- ✅ Exercise counts shown: "Workout 1 (5)"
- ✅ Rest days marked with "—"

**Pass/Fail:** ____

---

### TC-109: Sidebar - Status Indicators

**Objective:** Status icons display correctly

**Steps:**
1. Have workouts in various states:
   - Empty (0 exercises)
   - Complete (>0 exercises)
   - Rest day
2. Observe sidebar icons

**Expected Results:**
- ✅ Empty: ⚠️ amber warning icon
- ✅ Complete: ✓ green check icon
- ✅ Rest day: — gray dash
- ✅ Current: → arrow indicator

**Pass/Fail:** ____

---

### TC-110: Sidebar - Click to Navigate

**Objective:** Clicking workout switches view

**Steps:**
1. Click different workout in sidebar
2. Observe main area updates

**Expected Results:**
- ✅ Main view switches to clicked workout
- ✅ Exercises for that workout loaded
- ✅ Sidebar highlights new current workout
- ✅ Workout title updates: "Week X: Workout Name"

**Pass/Fail:** ____

---

### TC-111: Exercise Card - All Fields

**Objective:** Exercise card shows all fields

**Steps:**
1. Add exercise to workout
2. View exercise card

**Expected Results:**
- ✅ Exercise name displayed
- ✅ Sets input (default from library)
- ✅ Reps input (empty or default)
- ✅ Weight input (empty)
- ✅ Weight unit dropdown (lbs, kg, bodyweight)
- ✅ Rest seconds input (60 default)
- ✅ Coaching notes textarea (from library or empty)
- ✅ Drag handle (⋮⋮) visible
- ✅ Menu button (⋮) visible
- ✅ Delete button (✕) visible

**Pass/Fail:** ____

---

### TC-112: Auto-Save - Sets Field

**Objective:** Changes auto-save after 500ms

**Steps:**
1. Change sets from 3 to 4
2. Click outside field (blur)
3. Wait 500ms
4. Observe save indicator

**Expected Results:**
- ✅ "Saving..." appears immediately
- ✅ "✓ Saved" appears after 500ms (green)
- ✅ Changes persist in localStorage
- ✅ Refresh shows saved value

**Pass/Fail:** ____

---

### TC-113: Auto-Save - All Fields

**Objective:** All fields auto-save

**Steps:**
1. Edit each field:
   - Sets: 5
   - Reps: "8-10"
   - Weight: "135"
   - Unit: "lbs"
   - Rest: "90"
   - Notes: "Focus on form"
2. Blur each field
3. Wait for saves

**Expected Results:**
- ✅ Each field saves independently
- ✅ Save indicators show for each
- ✅ All changes persist
- ✅ No data loss

**Pass/Fail:** ____

---

### TC-114: Auto-Save - Error Handling

**Objective:** Handle save failures gracefully

**Steps:**
1. Simulate localStorage full/error
2. Edit exercise field
3. Observe error handling

**Expected Results:**
- ✅ "⚠️ Failed" indicator shown (red)
- ✅ Error message displayed
- ✅ Retry option available
- ✅ Data not lost (reverts or queues)

**Pass/Fail:** ____

---

### TC-115: Duplicate Exercise (Within Workout)

**Objective:** Duplicate creates copy

**Steps:**
1. Click menu (⋮) on exercise
2. Select "Duplicate"
3. Observe result

**Expected Results:**
- ✅ Copy created below original
- ✅ All fields copied (sets, reps, weight, notes)
- ✅ New unique ID assigned
- ✅ "[Name] (Copy)" not added to name
- ✅ Immediate save

**Pass/Fail:** ____

---

### TC-116: Copy to Other Workouts - Open Modal

**Objective:** Modal opens with workout list

**Steps:**
1. Click menu (⋮) on exercise
2. Select "Copy to Other Workouts"
3. Observe modal

**Expected Results:**
- ✅ Modal: "Copy '[Exercise Name]' to:"
- ✅ All weeks listed
- ✅ All workouts under each week (checkboxes)
- ✅ Current workout disabled/grayed
- ✅ Footer: "Copy to 0 ✓" (initially)

**Pass/Fail:** ____

---

### TC-117: Copy to Other Workouts - Select Multiple

**Objective:** Can select multiple target workouts

**Steps:**
1. Open copy modal
2. Check 3 workouts
3. Observe count

**Expected Results:**
- ✅ Checkboxes toggle on click
- ✅ Footer updates: "Copy to 3 ✓"
- ✅ Can select across different weeks
- ✅ Current workout not selectable

**Pass/Fail:** ____

---

### TC-118: Copy to Other Workouts - Execute

**Objective:** Copies exercise to selected workouts

**Steps:**
1. Select 3 target workouts
2. Click "Copy to 3 ✓"
3. Navigate to target workouts
4. Verify exercise present

**Expected Results:**
- ✅ Modal closes
- ✅ Success message shown
- ✅ Exercise appears in all 3 targets
- ✅ All fields copied (sets, reps, weight, notes)
- ✅ Unique IDs for each copy
- ✅ Usage count incremented (if tracked)

**Pass/Fail:** ____

---

### TC-119: Exercise Menu - All Options

**Objective:** Menu shows all available actions

**Steps:**
1. Click menu (⋮) on first exercise
2. View menu options
3. Click menu on last exercise
4. Compare options

**Expected Results:**
- ✅ First exercise menu:
  - Duplicate ✓
  - Copy to Other Workouts ✓
  - Move Up (disabled)
  - Move Down ✓
  - Remove ✓
- ✅ Last exercise menu:
  - Move Down (disabled)
  - Move Up ✓
- ✅ Icons match actions

**Pass/Fail:** ____

---

### TC-120: Move Exercise Up/Down

**Objective:** Reorder exercises within workout

**Steps:**
1. Have 3+ exercises
2. Click menu on 2nd exercise
3. Select "Move Up"
4. Observe order

**Expected Results:**
- ✅ Exercise swaps with one above
- ✅ Order numbers update
- ✅ Smooth animation (optional)
- ✅ New order saved immediately

**Pass/Fail:** ____

---

### TC-121: Remove Exercise from Workout

**Objective:** Delete exercise from workout

**Steps:**
1. Click delete (✕) on exercise
2. Observe (may have confirmation)
3. Confirm if prompted

**Expected Results:**
- ✅ Exercise removed immediately
- ✅ Sidebar count decreases
- ✅ Remaining exercises renumber
- ✅ Change saved

**Pass/Fail:** ____

---

### TC-122: Next Workout Button

**Objective:** Navigate to next workout

**Steps:**
1. View first workout
2. Click "Save & Next Workout →"
3. Observe navigation

**Expected Results:**
- ✅ Auto-saves current workout
- ✅ Navigates to next non-rest workout
- ✅ Skips rest days
- ✅ Wraps to next week if needed
- ✅ Sidebar updates current indicator

**Pass/Fail:** ____

---

### TC-123: Last Workout - Next Button

**Objective:** Handle last workout edge case

**Steps:**
1. Navigate to last workout in plan
2. Click "Save & Next Workout"

**Expected Results:**
- ✅ Button text changes or disables
- ✅ Shows completion message
- ✅ Or returns to first workout
- ✅ No error/crash

**Pass/Fail:** ____

---

### TC-124: Weight Unit Dropdown

**Objective:** All weight units work

**Steps:**
1. Set weight to 100
2. Select "lbs" - observe
3. Select "kg" - observe
4. Select "bodyweight" - observe

**Expected Results:**
- ✅ All units selectable
- ✅ Unit saves with weight
- ✅ "bodyweight" might disable weight input
- ✅ Saved and displayed correctly

**Pass/Fail:** ____

---

### TC-125: Rest Seconds Field

**Objective:** Rest seconds input works

**Steps:**
1. Set rest to 90 seconds
2. Blur field
3. Verify saved

**Expected Results:**
- ✅ Accepts numeric input
- ✅ Default = 60 seconds
- ✅ Auto-saves on blur
- ✅ Displays as "90 sec" or similar

**Pass/Fail:** ____

---

### TC-126: Empty Workout State

**Objective:** Handle workout with 0 exercises

**Steps:**
1. View workout with no exercises
2. Observe UI

**Expected Results:**
- ✅ Message: "No exercises yet"
- ✅ "+ Add Exercise" button prominent
- ✅ No error
- ✅ Sidebar shows ⚠️ warning

**Pass/Fail:** ____

---

### TC-127: Rest Day View

**Objective:** Rest day shows appropriate UI

**Steps:**
1. Click on rest day in sidebar
2. Observe main view

**Expected Results:**
- ✅ Message: "Rest Day" or emoji 😴
- ✅ No exercise list
- ✅ No "+ Add Exercise" button
- ✅ Can still navigate away

**Pass/Fail:** ____

---

### TC-128: Persistence - Page Refresh

**Objective:** All data persists across refresh

**Steps:**
1. Add exercises to workout
2. Configure all fields
3. Refresh page (F5)
4. Navigate back to same workout

**Expected Results:**
- ✅ All exercises still present
- ✅ All field values preserved
- ✅ Order maintained
- ✅ No data loss

**Pass/Fail:** ____

---

### TC-129: Large Workout (20+ Exercises)

**Objective:** Handle many exercises gracefully

**Steps:**
1. Add 25 exercises to one workout
2. Scroll through list
3. Edit exercises at bottom

**Expected Results:**
- ✅ All exercises render
- ✅ Scrollable container
- ✅ No performance issues
- ✅ Save works for all
- ✅ Sidebar count accurate

**Pass/Fail:** ____

---

### TC-130: Complete Workflow - Create Plan

**Objective:** End-to-end plan creation

**Steps:**
1. Load common exercises (if needed)
2. Create new plan (Phase 1)
3. Customize structure (Phase 2)
4. Add exercises to first workout
5. Configure parameters
6. Navigate through all workouts
7. Add exercises to each

**Expected Results:**
- ✅ Complete flow <10 minutes
- ✅ All phases connected
- ✅ No breaks in UX
- ✅ Data persists throughout
- ✅ Final plan has all workouts filled

**Pass/Fail:** ____

---

## Edge Cases & Error Scenarios

### TC-201: Exercise with Special Characters

**Objective:** Handle special chars in names

**Steps:**
1. Create exercise: "Dumbbell Press (30°)"
2. Search for it
3. Use in workout

**Expected Results:**
- ✅ Special characters allowed
- ✅ Search works
- ✅ Displays correctly
- ✅ No encoding issues

**Pass/Fail:** ____

---

### TC-202: Very Long Exercise Name

**Objective:** Handle max-length names

**Steps:**
1. Create exercise with 50-character name
2. View in library
3. View in workout picker
4. Add to workout

**Expected Results:**
- ✅ Name not truncated unexpectedly
- ✅ UI doesn't break
- ✅ Responsive layout maintained

**Pass/Fail:** ____

---

### TC-203: Multiple Quick-Start Attempts

**Objective:** Prevent duplicate loads

**Steps:**
1. Load common exercises
2. Note count (25)
3. Try loading again

**Expected Results:**
- ✅ Detects existing exercises
- ✅ Shows message: "Already loaded"
- ✅ No duplicates created

**Pass/Fail:** ____

---

### TC-204: Delete All Exercises

**Objective:** Can delete all and rebuild

**Steps:**
1. Delete all exercises from library
2. Observe empty state
3. Load common exercises again

**Expected Results:**
- ✅ Empty state displays
- ✅ Can load common exercises
- ✅ Fresh 25 exercises created

**Pass/Fail:** ____

---

### TC-205: Search with No Input

**Objective:** Empty search shows all

**Steps:**
1. Type and then clear search
2. Observe results

**Expected Results:**
- ✅ All exercises visible
- ✅ No error
- ✅ Category grouping intact

**Pass/Fail:** ____

---

## Performance Test Cases

### TC-301: Library with 100+ Exercises

**Objective:** Test performance at scale

**Steps:**
1. Create 100 exercises manually or programmatically
2. Navigate library
3. Search and filter
4. Measure response time

**Expected Results:**
- ✅ Library loads in <2 seconds
- ✅ Search debounce prevents lag
- ✅ No UI freeze
- ✅ Smooth scrolling

**Pass/Fail:** ____

---

### TC-302: Plan with 50+ Workouts

**Objective:** Large plan performance

**Steps:**
1. Create 12-week plan with 6 workouts/week (72 total)
2. Navigate through workouts
3. Use sidebar

**Expected Results:**
- ✅ Sidebar renders all workouts
- ✅ Navigation responsive
- ✅ No lag when switching
- ✅ Status icons load quickly

**Pass/Fail:** ____

---

### TC-303: Auto-Save Under Load

**Objective:** Auto-save handles rapid edits

**Steps:**
1. Rapidly edit multiple fields
2. Type quickly in reps/notes
3. Blur and re-focus quickly

**Expected Results:**
- ✅ Debounce prevents excessive saves
- ✅ All changes eventually saved
- ✅ No save conflicts
- ✅ UI remains responsive

**Pass/Fail:** ____

---

## Browser Compatibility (Manual)

### TC-401: Chrome
- ✅ All features work
- ✅ Styling correct
- ✅ No console errors

**Pass/Fail:** ____

---

### TC-402: Firefox
- ✅ All features work
- ✅ Styling correct
- ✅ No console errors

**Pass/Fail:** ____

---

### TC-403: Safari
- ✅ All features work
- ✅ Styling correct
- ✅ No console errors

**Pass/Fail:** ____

---

### TC-404: Mobile Responsive (Chrome DevTools)
- ✅ Library responsive on mobile viewport
- ✅ Forms usable on touch
- ✅ Sidebar collapses or adapts
- ✅ No horizontal scroll

**Pass/Fail:** ____

---

## Security & Data Integrity

### TC-501: localStorage Quota

**Objective:** Handle storage limits

**Steps:**
1. Fill localStorage near quota
2. Try adding exercises
3. Observe error handling

**Expected Results:**
- ✅ Error caught gracefully
- ✅ User notified
- ✅ App doesn't crash
- ✅ Suggests clearing data

**Pass/Fail:** ____

---

### TC-502: XSS Prevention

**Objective:** Prevent script injection

**Steps:**
1. Try creating exercise with name: `<script>alert('xss')</script>`
2. Try notes: `<img src=x onerror=alert('xss')>`

**Expected Results:**
- ✅ Scripts not executed
- ✅ Text displayed literally or sanitized
- ✅ No security vulnerability

**Pass/Fail:** ____

---

### TC-503: Data Export/Import (Future)

**Objective:** Can export and restore data

**Steps:**
1. Export library to JSON
2. Clear library
3. Import from JSON

**Expected Results:**
- ✅ All exercises exported
- ✅ Import restores correctly
- ✅ IDs preserved or regenerated safely

**Pass/Fail:** ____

---

## Test Summary

**Total Test Cases:** 503
- Phase 3 (Exercise Library): TC-001 to TC-025 (25 tests)
- Phase 4 (Workout Builder): TC-101 to TC-130 (30 tests)
- Edge Cases: TC-201 to TC-205 (5 tests)
- Performance: TC-301 to TC-303 (3 tests)
- Browser Compatibility: TC-401 to TC-404 (4 tests)
- Security: TC-501 to TC-503 (3 tests)

**Pass Rate Target:** ≥95% (48/50 minimum)

---

## Notes for Testers

1. **Test in order** - Some tests depend on earlier setup
2. **Clear localStorage** between major test sections
3. **Document failures** with screenshots
4. **Check console** for errors on every test
5. **Test both happy path and error cases**
6. **Verify persistence** by refreshing frequently

---

## Bug Report Template

```
**Bug ID:** BUG-XXX
**Test Case:** TC-XXX
**Severity:** Critical / High / Medium / Low
**Steps to Reproduce:**
1.
2.
3.

**Expected Result:**

**Actual Result:**

**Screenshot/Video:**

**Console Errors:**

**Browser/Version:**
```
