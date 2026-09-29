const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

const CONFIG_FILE = path.join(__dirname, '..', 'theme-config.json');
const CLIENT_CSS_FILE = path.join(__dirname, '..', 'client', 'src', 'custom-theme.css');
const PAGE_COMPONENTS_FILE = path.join(__dirname, '..', 'client', 'src', 'data', 'pageComponents.json');

let pageComponents = [];
try {
  if (fs.existsSync(PAGE_COMPONENTS_FILE)) {
    pageComponents = JSON.parse(fs.readFileSync(PAGE_COMPONENTS_FILE, 'utf8'));
  }
} catch (e) {
  console.error('[theme] Could not load pageComponents.json:', e.message);
}

const defaultSections = {
  testimonials: {
    marginTop: '0rem',
    marginBottom: '0rem',
    paddingTop: '5.5rem',
    paddingBottom: '5.5rem',
    paddingX: '0rem',
    bgColor: '',
    cardPadding: '1.75rem',
    cardGap: '1.5rem'
  },
  faq: {
    marginTop: '0rem',
    marginBottom: '0rem',
    paddingTop: '5.5rem',
    paddingBottom: '5.5rem',
    paddingX: '0rem',
    bgColor: '',
    cardPadding: '1.25rem',
    cardGap: '1rem'
  },
  pricing: {
    marginTop: '0rem',
    marginBottom: '0rem',
    paddingTop: '4rem',
    paddingBottom: '4rem',
    paddingX: '1.5rem',
    bgColor: '',
    cardPadding: '2.75rem',
    cardGap: '1.75rem'
  },
  hero: {
    marginTop: '0rem',
    marginBottom: '0rem',
    paddingTop: '6rem',
    paddingBottom: '5rem',
    paddingX: '1.5rem',
    bgColor: '',
    cardPadding: '2rem',
    cardGap: '1.5rem'
  },
  features: {
    marginTop: '0rem',
    marginBottom: '0rem',
    paddingTop: '5rem',
    paddingBottom: '5rem',
    paddingX: '1.5rem',
    bgColor: '',
    cardPadding: '2.5rem',
    cardGap: '1.75rem'
  },
  howToUse: {
    marginTop: '0rem',
    marginBottom: '0rem',
    paddingTop: '4.5rem',
    paddingBottom: '4.5rem',
    paddingX: '1.5rem',
    bgColor: '',
    cardPadding: '2.25rem',
    cardGap: '2rem'
  }
};

const defaultTheme = {
  // Spacing (Margins & Paddings - Global Defaults)
  sectionPaddingY: '4.5rem',
  sectionMarginY: '0rem',
  containerMaxWidth: '1200px',
  containerPaddingX: '1.5rem',
  cardPadding: '2.25rem',
  cardGap: '1.75rem',
  buttonPaddingY: '0.75rem',
  buttonPaddingX: '1.5rem',
  heroPaddingY: '5rem',

  // Section-Specific Spacing & Styling
  sections: defaultSections,

  // Granular Sub-Component Spacing & Styling (Every divided part)
  components: {},

  // Colors
  primaryColor: '#45AEF1',
  primaryGradientEnd: '#2B8CE6',
  pageBg: '#FFFFFF',
  cardBg: '#FFFFFF',
  textDark: '#1F2228',
  textGray: '#667085',
  borderColor: '#E2E8F0',

  // Typography
  fontFamily: "'Inter', sans-serif",
  fontSizeBase: '16px',
  heroTitleSize: '3.5rem',
  headingFontWeight: '700',
  lineHeightBase: '1.6',

  // Borders & Radii
  cardBorderRadius: '16px',
  buttonBorderRadius: '8px',
  cardBorderWidth: '1px',

  // Shadows & Effects
  shadowIntensity: 'medium', // 'none' | 'subtle' | 'medium' | 'glow' | 'deep'
  backdropBlur: '16px',
  cardHoverLift: '-6px',

  // Custom CSS override
  customCss: ''
};

function generateCss(theme) {
  const shadowMap = {
    none: 'none',
    subtle: '0 2px 10px rgba(0, 0, 0, 0.04)',
    medium: '0 8px 30px rgba(0, 0, 0, 0.08)',
    glow: `0 8px 32px ${theme.primaryColor}33, 0 0 0 1px ${theme.primaryColor}26`,
    deep: '0 20px 50px rgba(0, 0, 0, 0.16)'
  };
  const cardShadow = shadowMap[theme.shadowIntensity] || shadowMap.medium;

  return `/* ==========================================================================
   SAFEMAILZ AUTO-GENERATED THEME OVERRIDES (SAVED FROM VISUAL STYLER)
   ========================================================================== */

:root {
  /* Spacing: Margins & Paddings */
  --section-padding-y: ${theme.sectionPaddingY};
  --section-margin-y: ${theme.sectionMarginY};
  --container-max-width: ${theme.containerMaxWidth};
  --container-padding-x: ${theme.containerPaddingX};
  --card-padding: ${theme.cardPadding};
  --card-gap: ${theme.cardGap};
  --button-padding-y: ${theme.buttonPaddingY};
  --button-padding-x: ${theme.buttonPaddingX};
  --hero-padding-y: ${theme.heroPaddingY};

  /* Colors */
  --primary-color: ${theme.primaryColor};
  --primary-gradient: linear-gradient(135deg, ${theme.primaryColor} 0%, ${theme.primaryGradientEnd} 100%);
  --bg-page: ${theme.pageBg};
  --card-bg: ${theme.cardBg};
  --text-dark: ${theme.textDark};
  --text-gray: ${theme.textGray};
  --border-color: ${theme.borderColor};

  /* Typography */
  --font-main: ${theme.fontFamily};
  --font-size-base: ${theme.fontSizeBase};
  --hero-title-size: ${theme.heroTitleSize};
  --heading-font-weight: ${theme.headingFontWeight};
  --line-height-base: ${theme.lineHeightBase};

  /* Borders & Radii */
  --card-border-radius: ${theme.cardBorderRadius};
  --button-border-radius: ${theme.buttonBorderRadius};
  --card-border-width: ${theme.cardBorderWidth};

  /* Effects */
  --card-shadow: ${cardShadow};
  --backdrop-blur: ${theme.backdropBlur};
  --card-hover-lift: ${theme.cardHoverLift};
}

/* Page Root & Body Styling */
body, .landing-page-root {
  background-color: var(--bg-page) !important;
  color: var(--text-dark);
  font-family: var(--font-main);
  font-size: var(--font-size-base);
  line-height: var(--line-height-base);
}

/* Container & Spacing Utilities */
.landing-page-root .container, .container {
  max-width: var(--container-max-width) !important;
  padding-left: var(--container-padding-x) !important;
  padding-right: var(--container-padding-x) !important;
}

/* Section Margins & Paddings */
.hero, .page-hero {
  padding-top: var(--hero-padding-y) !important;
  padding-bottom: var(--hero-padding-y) !important;
  margin-top: var(--section-margin-y) !important;
  margin-bottom: var(--section-margin-y) !important;
}

.hero-title, .page-hero h1 {
  font-size: var(--hero-title-size) !important;
  font-weight: var(--heading-font-weight) !important;
  color: var(--text-dark) !important;
}

section.container, .landing-page-root section:not(.hero):not(.page-hero) {
  padding-top: var(--section-padding-y) !important;
  padding-bottom: var(--section-padding-y) !important;
  margin-top: var(--section-margin-y) !important;
  margin-bottom: var(--section-margin-y) !important;
}

/* Cards (Pricing, Features, How to use, Testimonials) */
.pricing-card, .feature-card, .how-card, .testimonial-card, .stat-card {
  padding: var(--card-padding) !important;
  border-radius: var(--card-border-radius) !important;
  background: var(--card-bg) !important;
  border: var(--card-border-width) solid var(--border-color) !important;
  box-shadow: var(--card-shadow) !important;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease !important;
}

.pricing-card:hover, .feature-card:hover, .how-card:hover, .testimonial-card:hover {
  transform: translateY(var(--card-hover-lift)) !important;
}

.pricing-card.popular:hover {
  transform: scale(1.03) translateY(var(--card-hover-lift)) !important;
}

/* Buttons */
.landing-page-root .btn-primary, .btn.btn-primary {
  padding: var(--button-padding-y) var(--button-padding-x) !important;
  border-radius: var(--button-border-radius) !important;
  background: var(--primary-gradient) !important;
  color: #ffffff !important;
}

.landing-page-root .btn-outline, .btn.btn-outline {
  padding: var(--button-padding-y) var(--button-padding-x) !important;
  border-radius: var(--button-border-radius) !important;
  border-color: var(--primary-color) !important;
  color: var(--primary-color) !important;
}

/* Grids & Gaps */
.pricing-grid, .features-grid, .steps-grid {
  gap: var(--card-gap) !important;
}

/* ── TARGETED SECTION-SPECIFIC OVERRIDES ─────────────────────────────── */
${(() => {
  const s = theme.sections || {};
  const t = s.testimonials || {};
  const f = s.faq || {};
  const p = s.pricing || {};
  const h = s.hero || {};
  const feat = s.features || {};
  const steps = s.howToUse || {};

  return `
/* Testimonials ("What others are saying about Us") */
.landing-page-root .testimonials, .testimonials {
  margin-top: ${t.marginTop || '0rem'} !important;
  margin-bottom: ${t.marginBottom || '0rem'} !important;
  padding-top: ${t.paddingTop || '5.5rem'} !important;
  padding-bottom: ${t.paddingBottom || '5.5rem'} !important;
  padding-left: ${t.paddingX || '0rem'} !important;
  padding-right: ${t.paddingX || '0rem'} !important;
  ${t.bgColor ? `background: ${t.bgColor} !important;` : ''}
}
.testimonials .testimonial-card {
  padding: ${t.cardPadding || '1.75rem'} !important;
}
.testimonials-grid {
  gap: ${t.cardGap || '1.5rem'} !important;
}

/* FAQs ("Frequently Asked Questions") */
.landing-page-root .faq, .faq {
  margin-top: ${f.marginTop || '0rem'} !important;
  margin-bottom: ${f.marginBottom || '0rem'} !important;
  padding-top: ${f.paddingTop || '5.5rem'} !important;
  padding-bottom: ${f.paddingBottom || '5.5rem'} !important;
  padding-left: ${f.paddingX || '0rem'} !important;
  padding-right: ${f.paddingX || '0rem'} !important;
  ${f.bgColor ? `background: ${f.bgColor} !important;` : ''}
}
.faq .faq-item {
  padding: ${f.cardPadding || '1.25rem'} !important;
}

/* Pricing Section */
.pricing-section, section.pricing, .pricing-grid {
  margin-top: ${p.marginTop || '0rem'} !important;
  margin-bottom: ${p.marginBottom || '0rem'} !important;
  gap: ${p.cardGap || '1.75rem'} !important;
  ${p.bgColor ? `background: ${p.bgColor} !important;` : ''}
}
.pricing-card {
  padding: ${p.cardPadding || '2.75rem 2rem'} !important;
}

/* Hero Banner */
.hero, .page-hero {
  margin-top: ${h.marginTop || '0rem'} !important;
  margin-bottom: ${h.marginBottom || '0rem'} !important;
  padding-top: ${h.paddingTop || '6rem'} !important;
  padding-bottom: ${h.paddingBottom || '5rem'} !important;
  ${h.bgColor ? `background: ${h.bgColor} !important;` : ''}
}

/* Features Section */
.features, #features {
  margin-top: ${feat.marginTop || '0rem'} !important;
  margin-bottom: ${feat.marginBottom || '0rem'} !important;
  padding-top: ${feat.paddingTop || '5rem'} !important;
  padding-bottom: ${feat.paddingBottom || '5rem'} !important;
  ${feat.bgColor ? `background: ${feat.bgColor} !important;` : ''}
}
.feature-card {
  padding: ${feat.cardPadding || '2.5rem'} !important;
}
.features-grid {
  gap: ${feat.cardGap || '1.75rem'} !important;
}

/* How to Use Steps */
.steps-grid, .step-card {
  margin-top: ${steps.marginTop || '0rem'} !important;
  margin-bottom: ${steps.marginBottom || '0rem'} !important;
}
.step-card {
  padding: ${steps.cardPadding || '2.25rem'} !important;
}
.steps-grid {
  gap: ${steps.cardGap || '2rem'} !important;
}
`;
})()}

/* ── INDIVIDUAL SUB-COMPONENT OVERRIDES (EVERY DIVIDED PART) ────────── */
${(() => {
  if (!theme.components || typeof theme.components !== 'object') return '';
  const componentMap = {};
  for (const c of pageComponents) {
    componentMap[c.id] = c;
  }

  let out = '';
  for (const [id, styles] of Object.entries(theme.components)) {
    if (!styles || typeof styles !== 'object') continue;
    const meta = componentMap[id];
    if (!meta || !meta.selector) continue;

    const rules = [];
    if (styles.marginTop) rules.push(`margin-top: ${styles.marginTop} !important;`);
    if (styles.marginBottom) rules.push(`margin-bottom: ${styles.marginBottom} !important;`);
    if (styles.marginLeft) rules.push(`margin-left: ${styles.marginLeft} !important;`);
    if (styles.marginRight) rules.push(`margin-right: ${styles.marginRight} !important;`);
    if (styles.paddingTop) rules.push(`padding-top: ${styles.paddingTop} !important;`);
    if (styles.paddingBottom) rules.push(`padding-bottom: ${styles.paddingBottom} !important;`);
    if (styles.paddingLeft) rules.push(`padding-left: ${styles.paddingLeft} !important;`);
    if (styles.paddingRight) rules.push(`padding-right: ${styles.paddingRight} !important;`);
    if (styles.bgColor) rules.push(`background: ${styles.bgColor} !important;`);
    if (styles.textColor) rules.push(`color: ${styles.textColor} !important;`);
    if (styles.fontSize) rules.push(`font-size: ${styles.fontSize} !important;`);
    if (styles.borderRadius) rules.push(`border-radius: ${styles.borderRadius} !important;`);
    if (styles.borderWidth) rules.push(`border-width: ${styles.borderWidth} !important;`);
    if (styles.borderColor) rules.push(`border-color: ${styles.borderColor} !important; border-style: solid !important;`);
    if (styles.gap) rules.push(`gap: ${styles.gap} !important;`);

    if (rules.length > 0) {
      out += `\n/* Part: ${meta.name} (${id}) */\n${meta.selector} {\n  ${rules.join('\n  ')}\n}\n`;
    }
  }
  return out;
})()}

/* Custom User CSS */
${theme.customCss || ''}
`;
}

function getStoredTheme() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf8');
      return { ...defaultTheme, ...JSON.parse(data) };
    }
  } catch (err) {
    console.error('[theme] Error reading theme-config.json:', err.message);
  }
  return { ...defaultTheme };
}

// GET /api/theme - Read current theme config
router.get('/', (req, res) => {
  const theme = getStoredTheme();
  res.json({ success: true, theme });
});

// POST /api/theme - Save theme config & write compiled CSS file
router.post('/', (req, res) => {
  try {
    const incomingTheme = req.body || {};
    const updatedTheme = { ...getStoredTheme(), ...incomingTheme };

    // Save JSON configuration
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(updatedTheme, null, 2), 'utf8');

    // Compile and write client custom-theme.css
    const compiledCss = generateCss(updatedTheme);
    fs.writeFileSync(CLIENT_CSS_FILE, compiledCss, 'utf8');

    res.json({
      success: true,
      message: 'Theme configuration and compiled CSS successfully saved to backend!',
      theme: updatedTheme
    });
  } catch (err) {
    console.error('[theme] Failed to save theme:', err);
    res.status(500).json({ success: false, error: 'Failed to save theme configuration' });
  }
});

// POST /api/theme/reset - Reset to factory defaults
router.post('/reset', (req, res) => {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaultTheme, null, 2), 'utf8');
    const compiledCss = generateCss(defaultTheme);
    fs.writeFileSync(CLIENT_CSS_FILE, compiledCss, 'utf8');

    res.json({
      success: true,
      message: 'Theme reset to default successfully!',
      theme: defaultTheme
    });
  } catch (err) {
    console.error('[theme] Failed to reset theme:', err);
    res.status(500).json({ success: false, error: 'Failed to reset theme' });
  }
});

module.exports = router;
