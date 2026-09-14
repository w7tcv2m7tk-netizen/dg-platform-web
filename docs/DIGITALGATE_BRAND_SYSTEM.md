# DigitalGate Brand System

## Product identity
DigitalGate product chrome uses a violet/purple identity. Customer organisation branding remains independent and must not recolour DigitalGate navigation, system actions or AI product identity.

## Canonical palette
- Primary — `#7C3AED`
- Primary hover — `#8B5CF6`
- Soft violet — `#A78BFA`
- Accent — `#C084FC`
- Deep violet — `#4C1D95`
- Ink — `#0C0716`
- Canvas — `#07050D`
- Surface — `#120B20`
- Product border — `rgba(167,139,250,.18)`
- Focus — `rgba(167,139,250,.42)`

## Usage
Primary violet is for product actions, active navigation, progress, focus and DigitalGate/Aida emphasis. Accent violet is supporting only. Dark violet/ink surfaces are preferred for immersive product moments such as onboarding. Neutral greys remain the primary reading surfaces elsewhere.

Success, warning and destructive colours retain their semantic colours; they must not be converted to purple.

## Onboarding
Onboarding is an immersive full-screen setup journey. It must not render the normal application shell. Aida is featured on the Welcome screen, then reduced to contextual assistance rather than repeated as a hero on every step. Each setup step owns the viewport and progresses forward like a device setup assistant.

## Branding separation
DigitalGate colour tokens describe the platform. Organisation brand colours describe customer content and customer-facing assets. Never overwrite an organisation's identity with DigitalGate purple.

## Logo
Use repository brand assets rather than text recreations. Prefer a vector master when one becomes available; until then render the highest-resolution canonical raster without unnecessary optimisation or enlargement beyond useful source resolution.

## Migration rule
New product UI should use DigitalGate tokens rather than introducing blue/sky action colours. Existing legacy blue/sky utilities are temporarily mapped to the product palette in `src/app/digitalgate-brand.css` while screens are migrated.
