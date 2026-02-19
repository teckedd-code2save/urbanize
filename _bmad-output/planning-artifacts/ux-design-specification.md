---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments: ['_bmad-output/planning-artifacts/product-brief-urbanize-2026-02-12.md', '_bmad-output/planning-artifacts/prd.md']
---

# UX Design Specification urbanize

**Author:** precisionxxx
**Date:** 2026-02-13

---

## Executive Summary

### Project Vision

Urbanize transforms urban parameter analysis from a 2-week manual archival research process into a 5-minute data generation workflow. It empowers student researchers to generate thesis-quality urban density data with academic rigor, enabling them to focus on analysis and insights rather than tedious manual counting. The tool provides server-side geometric comparison of historical building and road density data, paired with visual evidence layers and citation-ready exports that meet academic publication standards.

### Target Users

**Primary User: The Student Researcher (Sarah)**
- Graduate students in urban planning, geography, or civil engineering
- Need to generate defensible thesis data under tight deadlines
- Comfortable with statistical tools (R/SPSS) but not GIS experts
- Working on desktop computers (university labs or personal laptops)
- Under extreme time pressure during thesis writing and finals periods
- Require data accuracy within 5% error margin for academic citation
- Need to defend methodology in thesis committee reviews

**Secondary User: The City Planner (David)**
- Municipal planning professionals justifying infrastructure budgets
- Need high-quality visualizations for stakeholder presentations
- Focus on visual evidence rather than raw data exports

### Key Design Challenges

1. **Complexity vs. Simplicity Paradox** - Balancing academic rigor (transparent methodology, defensible calculations) with extreme simplicity for non-GIS experts under deadline pressure
2. **Data Confidence & Trust** - Communicating data quality, coverage warnings, and calculation transparency without creating user anxiety
3. **Dual-Context Visualization** - Presenting both visual context (satellite imagery) and analytical context (heatmaps) in a unified, non-gimmicky interface
4. **Progressive Disclosure** - Designing a simple MVP foundation that can scale to power features (ratio views, polygon drawing, admin dashboards) without interface clutter

### Design Opportunities

1. **"Citation-Native" UX Innovation** - Making methodology transparency a competitive advantage through elegant presentation of version numbers, formula tooltips, and export metadata
2. **Time-Travel as Core Metaphor** - Designing the entire interface around temporal comparison with timeline controls, before/after states, and change deltas as hero elements
3. **Progressive Feedback During Processing** - Transforming 30-second processing waits into learning moments by showing system activity ("Fetching 2015 building footprints...", "Calculating geometric diff...")
4. **Export as Celebration** - Making CSV download feel like an achievement with data previews, citation strings, and "Ready for R-Studio" confirmations

---

## Core User Experience

### Defining Experience

The core experience of Urbanize centers on **drawing the analysis area** - a single, critical interaction that must balance precision with simplicity. Users click to place a center point on the map, drag to define the radius (1-3km), and immediately see their analysis boundary. This simple gesture triggers the entire analytical workflow: historical data retrieval, geometric comparison, and visualization generation.

The experience follows a linear flow optimized for speed and clarity:
1. **Select** a pre-indexed city (London, NYC, Singapore)
2. **Draw** the circular analysis area with precision
3. **Choose** two time periods for comparison via visual timeline
4. **Review** the computed diff with split-screen visualization
5. **Export** citation-ready CSV data

The entire flow is designed to achieve the "Thesis Test": generating a valid density vs. traffic correlation graph in under 10 minutes.

### Platform Strategy

**Primary Platform:** Desktop Web Application
- **Browser Support:** Chrome, Firefox, Edge (latest 2 versions), Safari (desktop)
- **Rendering:** WebGL mandatory for high-performance map interactions
- **Input Method:** Mouse/keyboard optimized (touch not required for MVP)
- **Connectivity:** Always-online required (Google Maps API, Overpass API dependencies)
- **Screen Optimization:** 13"-27" displays (university labs + personal laptops)
- **Resolution Target:** Minimum 1280x720, optimized for 1920x1080

**Platform Constraints:**
- No mobile support in MVP (desktop-only research workflow)
- No offline functionality (real-time API integration required)
- Multi-monitor awareness not required but should not break layout

### Effortless Interactions

1. **Circle Drawing Tool** - Click center, drag radius, done. No multi-step wizards or complex polygon tools. Visual feedback shows radius distance in real-time (e.g., "2.3 km").

2. **Time Period Selection** - Visual timeline scrubber showing data availability at a glance (green = good coverage, yellow = sparse, red = unavailable). Users select two years by clicking timeline markers.

3. **One-Click Export** - Once computation completes, prominent "Download CSV" button pre-configured with citation metadata. No export dialogs or format selection required.

4. **Automatic City Positioning** - Selecting "London" immediately centers the map on London with appropriate zoom level. No manual navigation required.

5. **Progressive Processing Feedback** - During 30-second computation, show informative status: "Fetching 2015 building footprints... 1,247 buildings found" → "Calculating geometric diff..." → "Generating heatmap..."

### Critical Success Moments

1. **First-Time Success (Minute 3)** - User draws their first circle and sees the split-screen visualization appear within 30 seconds. The interface clearly shows building density change (e.g., "+15% Building Density").

2. **Trust Moment (Minute 5)** - User hovers over a metric and sees methodology tooltip ("Building Density = Total Footprint Area / Circle Area, calculated using Albers equal-area projection"). Or sees "Low Confidence" warning for sparse data with recommendation to try different year.

3. **Achievement Moment (Minute 8)** - User clicks "Download CSV" and sees confirmation: "Ready for R-Studio" with citation string preview ("Data via Urbanize v1.0, OSM Historical Data 2015-2023").

4. **Validation Moment (Post-Export)** - User can defend methodology in thesis committee because tool exposed all calculation details, version numbers, and data sources in export metadata.

### Experience Principles

1. **"Precision without Complexity"** - Drawing the analysis area must be precise enough for academic rigor but simple enough for non-GIS experts. The circle tool should feel natural, with clear radius indicators (visual + numeric) and easy adjustment via drag handles.

2. **"Transparency Builds Trust"** - Every calculation, data source, and methodology decision should be accessible but not overwhelming. Use progressive disclosure: show results prominently, expose methodology on hover/click. Make the "black box" transparent without creating information overload.

3. **"Time-Travel is the Interface"** - The temporal comparison isn't a feature—it's the core metaphor. The entire UI should reinforce the before/after narrative with visual timeline controls, split-screen comparisons, and change deltas as hero elements (not buried in tables).

4. **"Waiting is Learning"** - The 30-second processing time should transform from a liability into an asset by showing system activity. Build confidence in analytical rigor by exposing what's happening: data fetching, geometric calculations, projection transformations.

5. **"Export is Celebration"** - The CSV download represents the culmination of research work. Make it feel like an achievement with data previews, citation strings, and clear "thesis-ready" messaging. This is the moment of success—design it accordingly.

---

## Desired Emotional Response

### Primary Emotional Goals

**Confident & Empowered** - Users should feel capable of generating professional-grade research data independently, without needing GIS expertise. The interface should communicate "You know exactly what you're doing" through clear visual hierarchy, real-time feedback, and intuitive interactions.

**Relieved & Grateful** - Users should experience profound relief when they realize this tool just saved them 2 weeks of manual archival research. The emotional payoff is "This tool just saved my thesis" - a combination of gratitude and excitement about discovering a secret weapon.

**Validated & Accomplished** - Upon exporting data, users should feel they've completed a significant thesis milestone with publication-quality work. The system should reinforce "This is defensible, citation-ready research data" through transparent methodology and academic-grade outputs.

**Trusting & Informed** - Throughout the experience, users should trust the data quality and calculation rigor. Transparency in processing, methodology tooltips, and proactive data quality warnings build this trust without creating anxiety.

### Emotional Journey Mapping

**Discovery (First Visit)**
- Target Emotion: Curious → Hopeful ("Could this really solve my problem?")
- Avoid: Skeptical, overwhelmed by complexity
- Design Support: Clean landing page, clear value proposition, immediate "Try Demo" option

**First Use (Drawing Circle, Selecting Dates)**
- Target Emotion: Confident → In Control ("This is intuitive, I know what I'm doing")
- Avoid: Confused, anxious about making mistakes
- Design Support: Clear visual feedback, real-time radius display, forgiving interactions with easy adjustments

**Processing (30-second wait)**
- Target Emotion: Informed → Trusting ("I can see what it's doing, this is rigorous")
- Avoid: Impatient, suspicious ("Is this even working?")
- Design Support: Progressive status updates ("Fetching 2015 building footprints... 1,247 buildings found"), educational micro-content during wait

**Results (Viewing Diff)**
- Target Emotion: Impressed → Validated ("Wow, this is exactly what I needed")
- Avoid: Uncertain, questioning data quality
- Design Support: Hero display of change deltas ("+15% Building Density"), split-screen visualization, methodology tooltips on hover

**Export (Download CSV)**
- Target Emotion: Accomplished → Grateful ("I just completed a major thesis milestone")
- Avoid: Anticlimactic, unsure if data is usable
- Design Support: "Ready for R-Studio" confirmation, citation string preview, success messaging

**Return Visit**
- Target Emotion: Familiar → Efficient ("I know exactly what to do")
- Avoid: Re-learning, friction
- Design Support: Consistent interface, saved preferences, quick-start for repeat workflows

### Micro-Emotions

**Confidence vs. Confusion** ✅ CRITICAL
- Build confidence through: Clear visual hierarchy, real-time feedback (radius display), undo/adjust capabilities, methodology tooltips
- Prevent confusion through: Single-path workflows, no hidden settings, visual confirmation of selections

**Trust vs. Skepticism** ✅ CRITICAL
- Build trust through: Transparent calculations, version numbers, citation strings, "Low Confidence" warnings when data is sparse
- Prevent skepticism through: Proactive data quality indicators, methodology exposure, academic-grade terminology

**Accomplishment vs. Frustration** ✅ CRITICAL
- Create accomplishment through: Progress milestones (✓ checkmarks), results celebration (prominent change deltas), export confirmation messaging
- Prevent frustration through: Forgiving interactions, no dead ends, helpful error messages with actionable next steps

**Delight vs. Satisfaction** ⚡ OPPORTUNITY
- Create delight through: Smooth animations, progressive disclosure, smart defaults (auto-center on city), satisfying micro-interactions
- Baseline satisfaction through: Fast performance, reliable results, predictable behavior

### Design Implications

**For Confidence:**
- Clear visual hierarchy with primary actions unmistakable
- Real-time feedback showing radius distance as user drags ("2.3 km")
- Undo/adjust capability without starting over
- Methodology tooltips on hover for any metric

**For Trust:**
- Transparent processing with status updates during 30-second wait
- Color-coded timeline (green/yellow/red) for data coverage quality
- Prominent version numbers ("Urbanize v1.0", "OSM Data 2015-2023")
- Proactive "Low Confidence" warnings with recommendations

**For Accomplishment:**
- Visual progress milestones (✓ City Selected, ✓ Area Drawn, ✓ Dates Set)
- Hero display of results ("+15% Building Density" as primary element)
- Export confirmation with "Ready for R-Studio" messaging
- Success messaging: "Analysis Complete - Thesis-Ready Data Generated"

**For Delight:**
- Smooth transitions between map states and timeline interactions
- Progressive disclosure of methodology (available on demand, not overwhelming)
- Smart defaults (auto-center on city, suggest optimal time periods)
- Educational loading animations that build confidence

**To Avoid Frustration:**
- No dead ends - every error includes actionable next steps
- Forgiving interactions - easy to adjust, no unnecessary confirmation dialogs
- Visual constraint communication (show 1-3km radius limits)
- Helpful errors: "2010 data sparse for Rio - try 2012 (90% coverage)"

### Emotional Design Principles

1. **"Confidence Through Clarity"** - Every interaction should reinforce "You know what you're doing." Use clear visual feedback, real-time confirmations, and intuitive controls that feel natural even for first-time users.

2. **"Trust Through Transparency"** - Make the "black box" visible without overwhelming. Show methodology on demand, expose data quality proactively, and use academic-grade terminology that builds credibility.

3. **"Accomplishment Through Celebration"** - Treat the export moment as a thesis milestone. Use success messaging, citation previews, and "thesis-ready" confirmations to create emotional payoff.

4. **"Delight Through Intelligence"** - Smart defaults, helpful suggestions, and educational wait states transform routine interactions into moments that feel thoughtful and considerate of user needs.

5. **"Relief Through Forgiveness"** - Allow easy adjustments, provide helpful error recovery, and eliminate anxiety-inducing confirmations. Users should feel safe to explore and experiment.

---


## UX Pattern Analysis & Inspiration

### Inspiring Products Analysis

**Google Maps - Map Interaction Excellence**

Google Maps excels at making complex spatial data feel effortless. The pan/zoom interactions require zero learning curve, and the "measure distance" tool demonstrates how drawing on a map can feel as natural as sketching with a pencil. Progressive disclosure keeps the interface clean by default while making power features available when needed. Real-time feedback during interactions (showing distances as you measure) builds user confidence. The smooth transitions between zoom levels and smart auto-zoom based on context create a polished, professional experience.

**Key Lessons:** Effortless spatial interaction, real-time measurement feedback, progressive disclosure, smart defaults, visual clarity despite data complexity.

**GitHub Diffs - Before/After Comparison Mastery**

GitHub's diff view is the industry standard for showing changes because it makes comparisons instantly understandable. The split-screen layout with color coding (green for additions, red for deletions) creates a universal visual language. Line-by-line precision shows exactly what changed while providing surrounding context for understanding. The option to toggle between unified and split views accommodates different user preferences. Subtle background colors highlight changes without overwhelming the interface.

**Key Lessons:** Split-screen clarity, color-coded changes, contextual information, visual precision, subtle professional aesthetics.

**Figma - Real-time Feedback & Export Excellence**

Figma demonstrates how real-time feedback creates confidence and delight. Measurements appear instantly as users interact, cursor positions show exact coordinates, and snap-to-grid guides provide visual confirmation. Every animation feels polished and intentional, communicating "this is serious professional work." The export experience is exemplary: users preview exactly what they're exporting, see clear format options with explanations, and receive file size estimates before download.

**Key Lessons:** Real-time measurements, smooth animations, export preview with clarity, professional visual design, satisfying micro-interactions.

### Transferable UX Patterns

**Navigation Patterns:**
- **Progressive Disclosure** - Start with simple interface (city selector, map, basic controls), reveal advanced features (ratio views, polygon drawing) only when needed. Balances MVP simplicity with growth feature scalability.
- **Contextual Actions** - Right-click on map for quick actions (recenter, clear selection) reduces toolbar clutter while maintaining power user efficiency.

**Interaction Patterns:**
- **Real-time Visual Feedback** - Display radius measurement ("2.3 km") as user draws circle. Builds confidence and precision without complexity.
- **Split-Screen Comparison** - Slider-based comparison for Satellite vs Heatmap, Time A vs Time B. Addresses dual-context visualization challenge.
- **Smart Defaults with Easy Override** - Auto-center on selected city, suggest optimal time periods based on data coverage. Reduces friction for first-time users under time pressure.

**Visual Patterns:**
- **Color-Coded Status Indicators** - Green/yellow/red timeline for data quality/coverage. Supports trust-building and data confidence goals.
- **Export Preview Pattern** - Show CSV preview and citation string before download. Supports "Export as Celebration" emotional goal and academic rigor requirements.
- **Subtle Professional Aesthetics** - Clean, minimal interface communicating seriousness. Builds academic credibility and trust.

### Anti-Patterns to Avoid

**From GIS Tools (ArcGIS, QGIS):**
- **Multi-step Wizards** - Confusing and anxiety-inducing for non-experts. Conflicts with "effortless interactions" goal. Instead: Single-gesture circle drawing.
- **Hidden Settings Dialogs** - Critical options buried in nested menus create confusion. Conflicts with clarity goal. Instead: Progressive disclosure with visible controls.
- **Technical Jargon Without Explanation** - Terms like "projection", "CRS" alienate non-GIS experts. Instead: Use explanatory tooltips ("Albers equal-area projection ensures accurate area calculations").

**From Complex Data Tools:**
- **Overwhelming Default Views** - Showing all data layers at once conflicts with simplicity. Instead: Start minimal, add layers on demand.
- **Generic Error Messages** - "Error 500" creates frustration and blocks progress. Instead: Helpful errors ("2010 data sparse for Rio - try 2012 (90% coverage)").

**From Academic Tools:**
- **Anticlimactic Export** - Plain file download misses "Export as Celebration" opportunity. Instead: Success message with citation preview.

### Design Inspiration Strategy

**Adopt As-Is:**
1. **Google Maps Circle Drawing** - Click center, drag radius, done. Already familiar to users, zero learning curve.
2. **GitHub Split-Screen Diff** - Side-by-side comparison with slider. Industry standard for before/after visualization.
3. **Figma Real-time Measurements** - Show dimensions as user interacts. Builds confidence and precision.

**Adapt for Context:**
1. **GitHub Color Coding** - Use heatmap gradients for density instead of binary green/red. Academic users need nuanced data visualization.
2. **Figma Export Preview** - Show CSV data preview + citation string instead of image preview. Users verify data format, not visual appearance.
3. **Google Maps Layer Toggle** - Simplify to 3 core metrics (Building Density, Road Density, Ratio View) instead of dozens of layers.

**Avoid Entirely:**
1. **Complex Toolbars** - Conflicts with simplicity and non-expert user base. Use minimal, contextual controls instead.
2. **Modal-Heavy Workflows** - Conflicts with speed goals (<10 minute workflow). Use inline controls and progressive disclosure.
3. **Generic Academic UI** - Conflicts with "Delight" emotional goal. Use clean, professional aesthetics inspired by modern design tools.

---

<!-- UX design content will be appended sequentially through collaborative workflow steps -->

## Design System Foundation

### Design System Choice

**Selected System:** Tailwind CSS + shadcn/ui

Tailwind CSS provides a utility-first CSS framework that enables rapid development while maintaining full design control. shadcn/ui offers a collection of beautifully designed, accessible React components built on Radix UI primitives that can be copied directly into the project and customized as needed. This combination delivers the speed of a component library with the flexibility of custom components.

**Component Strategy:**
- **Foundation:** Tailwind CSS utility classes for all styling
- **UI Primitives:** shadcn/ui components (Button, Dialog, Tooltip, Dropdown, Card)
- **Accessibility Layer:** Radix UI unstyled primitives (built into shadcn/ui)
- **Custom Components:** Map controls, circle drawing tool, timeline scrubber, split-screen slider, heatmap overlays

### Rationale for Selection

**Fast MVP Development** - Tailwind's utility-first approach enables rapid prototyping without writing custom CSS files. shadcn/ui provides copy-paste components that accelerate development while avoiding npm dependency bloat. Industry-standard patterns reduce decision fatigue during implementation.

**CSS Expertise Leverage** - Direct control over styling through utility classes without fighting framework opinions. Full transparency into component implementation with easy customization at the utility level. Comfortable for developers with CSS expertise who want precision control.

**Fresh Brand with Industry Standards** - Start with Tailwind's excellent default color palette (slate for neutral, blue for primary actions, emerald for success states) that conveys academic professionalism. Easy to customize to specific brand colors as the product evolves. Modern, clean aesthetic out of the box.

**Commercial Growth Potential** - Used by major companies (GitHub, Shopify, NASA) with proven scalability from MVP to enterprise. Large talent pool familiar with Tailwind reduces hiring friction. No framework lock-in since it's fundamentally just CSS with utility classes.

**Map Integration Flexibility** - Tailwind's utility-first approach integrates seamlessly with WebGL map libraries (Mapbox GL JS, Leaflet) without conflicting framework opinions. Custom map controls and overlays can be styled with Tailwind utilities while maintaining performance.

### Implementation Approach

**Core Technology Stack:**
- **Tailwind CSS 3.x** - Utility-first CSS framework with JIT compiler
- **shadcn/ui** - Copy-paste React component collection
- **Radix UI** - Unstyled accessible primitives (foundation for shadcn/ui)
- **class-variance-authority (CVA)** - Type-safe component variant management

**Map & Visualization Integration:**
- **Mapbox GL JS** or **Leaflet** - WebGL map rendering engine
- **D3.js** - Heatmap generation and data visualization
- Tailwind utilities for map controls, overlays, and UI elements
- Custom components for circle drawing, timeline scrubber, split-screen slider

**Component Architecture:**
- **Use shadcn/ui for:** Buttons, Modals, Tooltips, Dropdowns, Dialogs, Cards, Form inputs
- **Build custom for:** Map controls, Circle drawing tool, Timeline scrubber, Split-screen comparison slider, Heatmap overlay, Data quality indicators
- **Customize shadcn/ui:** Apply Tailwind utilities to align with brand and academic aesthetic

**Accessibility Foundation:**
- Radix UI primitives ensure WCAG 2.1 AA compliance out of the box
- Keyboard navigation built-in for all interactive elements
- Focus management handled by Tailwind's `focus:` utilities
- Screen reader support via Radix UI's comprehensive aria attributes

**Performance Optimization:**
- Tailwind JIT compiler generates only used utilities (minimal bundle size)
- PurgeCSS removes unused styles in production builds
- shadcn/ui components are tree-shakeable (import only what's needed)
- No runtime CSS-in-JS overhead

### Customization Strategy

**Design Tokens (Tailwind Configuration):**

**Color Palette:**
- **Primary (Blue)** - Trust, academic credibility, primary actions (sky-500: #0ea5e9)
- **Secondary (Slate)** - Neutral, professional, secondary UI elements (slate-500: #64748b)
- **Success (Green)** - Data available, positive density changes (emerald-500: #10b981)
- **Warning (Amber)** - Sparse data warnings, low confidence indicators (amber-500: #f59e0b)
- **Error (Red)** - Errors, unavailable data, critical warnings (red-500: #ef4444)

**Typography:**
- **Sans-serif:** Inter (clean, modern, excellent readability for academic content)
- **Monospace:** JetBrains Mono (data displays, CSV previews, technical information)

**Spacing & Layout:**
- Use Tailwind's default spacing scale (4px base unit)
- Consistent padding/margin patterns for visual rhythm
- Responsive breakpoints for desktop optimization (sm: 640px, md: 768px, lg: 1024px, xl: 1280px)

**Component Customization Patterns:**

**Buttons:**
- Primary: `bg-primary-500 hover:bg-primary-600 text-white` (main actions like "Download CSV")
- Secondary: `border border-slate-300 hover:bg-slate-50` (secondary actions like "Clear Selection")
- Danger: `bg-red-500 hover:bg-red-600 text-white` (destructive actions)

**Tooltips:**
- Methodology tooltips: Dark background with monospace font for formulas
- Help tooltips: Light background with sans-serif for explanations
- Triggered on hover with 200ms delay for desktop UX

**Modals/Dialogs:**
- Export preview: Large modal with CSV data preview and citation string
- Data quality warnings: Medium modal with color-coded severity indicators
- Confirmation dialogs: Small modal for non-destructive confirmations

**Custom Map Components:**
- Circle drawing tool: Tailwind utilities for radius display overlay
- Timeline scrubber: Custom Radix Slider with year markers and data quality indicators
- Split-screen slider: Custom component with smooth Tailwind transitions

**Status Indicators:**
- Data quality timeline: Green (>80% coverage), Yellow (50-80%), Red (<50%)
- Processing states: Animated spinner with status text
- Success states: Green checkmark with confirmation message

---

<!-- UX design content will be appended sequentially through collaborative workflow steps -->
