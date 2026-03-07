ScriptEngine — Frontend Design Brief (Lovable)
1. Project Overview

ScriptEngine is a mobile-first creator tool that generates short-form video scripts and lets creators film immediately using an in-app teleprompter camera. 

PRD

The design must feel native to the short-form creator ecosystem, visually continuing the language of:

TikTok

CapCut

The user should feel like they never left the creator stack.

Key experience principle

Script → Film → Post
should feel like one continuous action.

The UI must prioritize speed, thumb usability, and filming flow.

2. Design Philosophy
Primary UX Goals

Reduce friction from idea → filming

Make scripts feel film-ready

Encourage daily posting

Mirror creator mental models

UX Characteristics

Mobile-native

Thumb-first navigation

Card-based content

Minimal text input

Bold typography

Vertical flow

Immediate CTAs

3. Visual Design Direction
Inspiration

Blend of:

TikTok

vertical content feed

large cards

bold action buttons

minimal chrome

CapCut

creator tooling aesthetic

clean panels

tool-focused UI

dark production environment

Color System

Primary theme: Dark Creator Studio

Background
#0B0B0D

Card
#141417

Accent
#00E5FF

Secondary Accent
#7C3AED

Success
#22C55E

Neutral
#A1A1AA

Typography

Primary

Inter

Display

Space Grotesk

Use large titles and short copy.

Examples:

Cold Open
Section 1
Call to Action
Film This
4. Core Navigation

Bottom navigation (5 items)

Home
Scripts
Camera
Series
Profile

Camera is center and emphasized.

Similar to TikTok's Create button prominence.

5. Core Screens
5.1 Home (Daily Script Feed)

Purpose: show today's generated scripts

Structure:

Header
"Today's Scripts"

Script Card
Script Card
Script Card
Script Card

Each card shows:

Script Type Badge
Cold Open (preview)
Duration
Series tag (optional)

[Film This]

Card interaction:

Tap → open Script Detail.

Swipe left → mark Filmed.

Swipe right → mark Posted.

Script Card Example
DATA DROP

"Most founders think raising VC is success.
But 94% of startups never return investor capital."

Duration: 52s

[ Film This ]
5.2 Script Detail Screen

Purpose: make the script film-ready

Sections visually separated.

Layout:

Cold Open
(words + camera direction)

Section 1
words
camera direction
b-roll
overlay text

Section 2
...

Call To Action
...

Film This

Sticky bottom button:

[Film With Teleprompter]

Secondary buttons:

Copy Caption
Copy Hashtags
5.3 Teleprompter Camera

This is the hero experience.

Design must feel like CapCut filming mode.

Layout:

Full screen camera

Overlay text (scrolling)

Controls:
Start
Pause
Speed slider
Stop

UI elements minimal.

Top bar:

Script Title
Close

Bottom bar:

Start Recording
Speed
Restart

When recording starts:

scroll begins automatically

camera recording begins

red recording indicator

5.4 Script Library

Purpose: manage scripts.

Tabs:

Ready
Filmed
Posted

Filters:

series

type

date

Card preview:

Cold open
duration
status
series
5.5 Series Screen

Visual map of episode progression.

Example layout:

Series: 30 Days of Startup Truths

Episode 1 ✔
Episode 2 ✔
Episode 3 ✔
Episode 4 Ready
Episode 5 Locked

Each episode clickable.

5.6 Script Performance

For scripts marked posted.

Show simple analytics entry:

Views
Likes
Shares
Follows

UI style:

simple numeric input.

6. Key Interaction Patterns
Script → Film Flow
Home
↓
Script Card
↓
Script Detail
↓
Film With Teleprompter
↓
Recording
↓
Saved to camera roll
↓
Status → Filmed

Must take < 3 taps.

Status Updates

Swipe gestures:

Ready → Filmed
Filmed → Posted

Visual animations.

7. Component System

Lovable should build reusable components:

Core Components

ScriptCard

SectionBlock

StatusBadge

SeriesBadge

CTAButton

SpeedSlider

CameraOverlayText

ScriptTypeBadge

Script Types Badge Colors
series_episode → purple
data_drop → cyan
trend_take → orange
niche_tip → green
8. Motion Design

Motion should mimic creator apps.

Examples:

Script card expand animation
Teleprompter scroll easing
Status swipe animations

Use:

subtle spring transitions

200–300ms durations

9. Empty States

Example:

No scripts today

No scripts yet.

Your daily scripts generate at 6AM.

[Generate Now]
10. First-Time Onboarding

3 screens.

Screen 1

"What do you create?"

Choose niche.

Screen 2

"How many videos per day?"

1 / 3 / 5 / 10.

Screen 3

"Your first scripts are ready."

CTA:

View Scripts
11. Key UX Principle

The user should never feel like they are writing.

Everything should feel like:

discover
read
film
post
12. Accessibility

large tap targets

readable teleprompter text

adjustable scroll speed

dark mode default

13. Platform

Mobile-first.

Primary platform:

React Native

iOS first

Matches the PRD stack. 

PRD

14. Deliverables From Lovable

Design system

Mobile screens for:

Home

Script Detail

Teleprompter Camera

Script Library

Series

Onboarding

Component library.

Prototype for filming flow.

15. Success Criteria

The design is successful if:

A creator can generate → film a video in under 2 minutes

Scripts feel ready to perform

The teleprompter experience feels better than external apps

✅ If you'd like, I can also generate:

a complete Lovable prompt that produces the UI automatically

wireframes for all screens

or a React Native component structure for the UI.