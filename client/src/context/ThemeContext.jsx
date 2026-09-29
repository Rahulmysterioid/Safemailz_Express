import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import pageComponents from '../data/pageComponents.json';

const ThemeContext = createContext();

export const defaultSections = {
  testimonials: {
    id: 'testimonials',
    name: '💬 Testimonials ("What others are saying")',
    selector: '.testimonials',
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
    id: 'faq',
    name: '❓ FAQs ("Frequently Asked Questions")',
    selector: '.faq',
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
    id: 'pricing',
    name: '💳 Pricing Section',
    selector: '.pricing-section, section.pricing, .pricing-grid',
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
    id: 'hero',
    name: '🚀 Hero Banner',
    selector: '.hero, .page-hero',
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
    id: 'features',
    name: '🛡️ Features Section',
    selector: '.features, #features',
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
    id: 'howToUse',
    name: '🏢 How to Use Steps',
    selector: '.steps-grid, .step-card',
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

export const defaultTheme = {
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

  // Section-Specific Overrides (Individual Part Styling)
  sections: defaultSections,

  // Granular Sub-Component Overrides (Every divided part)
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

  // Custom CSS
  customCss: ''
};

export const themePresets = {
  classic: {
    name: '🔵 Classic Safemailz',
    primaryColor: '#45AEF1',
    primaryGradientEnd: '#2B8CE6',
    pageBg: '#FFFFFF',
    cardBg: '#FFFFFF',
    textDark: '#1F2228',
    textGray: '#667085',
    borderColor: '#E2E8F0',
    cardBorderRadius: '16px',
    buttonBorderRadius: '8px',
    cardPadding: '2.25rem',
    sectionPaddingY: '4.5rem',
    shadowIntensity: 'medium',
    fontFamily: "'Inter', sans-serif"
  },
  emeraldCyber: {
    name: '🟢 Emerald Shield',
    primaryColor: '#10B981',
    primaryGradientEnd: '#059669',
    pageBg: '#F0FDF4',
    cardBg: '#FFFFFF',
    textDark: '#064E3B',
    textGray: '#047857',
    borderColor: '#A7F3D0',
    cardBorderRadius: '20px',
    buttonBorderRadius: '12px',
    cardPadding: '2.5rem',
    sectionPaddingY: '5rem',
    shadowIntensity: 'glow',
    fontFamily: "'Plus Jakarta Sans', sans-serif"
  },
  midnightDark: {
    name: '🌙 Midnight OLED',
    primaryColor: '#38BDF8',
    primaryGradientEnd: '#818CF8',
    pageBg: '#090D16',
    cardBg: '#131B2E',
    textDark: '#F8FAFC',
    textGray: '#94A3B8',
    borderColor: '#1E293B',
    cardBorderRadius: '18px',
    buttonBorderRadius: '10px',
    cardPadding: '2.25rem',
    sectionPaddingY: '4.5rem',
    shadowIntensity: 'glow',
    fontFamily: "'Inter', sans-serif"
  },
  violetRoyale: {
    name: '🟣 Violet Royale',
    primaryColor: '#8B5CF6',
    primaryGradientEnd: '#6366F1',
    pageBg: '#FAF5FF',
    cardBg: '#FFFFFF',
    textDark: '#2E1065',
    textGray: '#6B21A8',
    borderColor: '#E9D5FF',
    cardBorderRadius: '24px',
    buttonBorderRadius: '9999px',
    cardPadding: '2.5rem',
    sectionPaddingY: '5.5rem',
    shadowIntensity: 'medium',
    fontFamily: "'Outfit', sans-serif"
  },
  sunsetAmber: {
    name: '🟠 Sunset Amber',
    primaryColor: '#F59E0B',
    primaryGradientEnd: '#EA580C',
    pageBg: '#FFFBEB',
    cardBg: '#FFFFFF',
    textDark: '#451A03',
    textGray: '#92400E',
    borderColor: '#FDE68A',
    cardBorderRadius: '14px',
    buttonBorderRadius: '8px',
    cardPadding: '2rem',
    sectionPaddingY: '4rem',
    shadowIntensity: 'subtle',
    fontFamily: "'Roboto', sans-serif"
  }
};

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(defaultTheme);
  const [selectedSection, setSelectedSection] = useState('testimonials'); // 'global' | 'testimonials' | 'faq' | 'pricing' | 'hero' | 'features' | 'howToUse'
  const [selectedComponentId, setSelectedComponentId] = useState('testimonials_cards');
  const [highlightActiveSection, setHighlightActiveSection] = useState(true);
  const [isInspectorActive, setIsInspectorActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  // Apply CSS variables and custom rules immediately to DOM
  const applyThemeToDom = useCallback((currentTheme, activeSection = selectedSection, showHighlight = highlightActiveSection, activeComponentId = selectedComponentId) => {
    if (!currentTheme) return;

    const shadowMap = {
      none: 'none',
      subtle: '0 2px 10px rgba(0, 0, 0, 0.04)',
      medium: '0 8px 30px rgba(0, 0, 0, 0.08)',
      glow: `0 8px 32px ${currentTheme.primaryColor}33, 0 0 0 1px ${currentTheme.primaryColor}26`,
      deep: '0 20px 50px rgba(0, 0, 0, 0.16)'
    };
    const cardShadow = shadowMap[currentTheme.shadowIntensity] || shadowMap.medium;

    const root = document.documentElement;
    root.style.setProperty('--section-padding-y', currentTheme.sectionPaddingY);
    root.style.setProperty('--section-margin-y', currentTheme.sectionMarginY);
    root.style.setProperty('--container-max-width', currentTheme.containerMaxWidth);
    root.style.setProperty('--container-padding-x', currentTheme.containerPaddingX);
    root.style.setProperty('--card-padding', currentTheme.cardPadding);
    root.style.setProperty('--card-gap', currentTheme.cardGap);
    root.style.setProperty('--button-padding-y', currentTheme.buttonPaddingY);
    root.style.setProperty('--button-padding-x', currentTheme.buttonPaddingX);
    root.style.setProperty('--hero-padding-y', currentTheme.heroPaddingY);

    root.style.setProperty('--primary-color', currentTheme.primaryColor);
    root.style.setProperty('--primary-gradient', `linear-gradient(135deg, ${currentTheme.primaryColor} 0%, ${currentTheme.primaryGradientEnd} 100%)`);
    root.style.setProperty('--bg-page', currentTheme.pageBg);
    root.style.setProperty('--card-bg', currentTheme.cardBg);
    root.style.setProperty('--text-dark', currentTheme.textDark);
    root.style.setProperty('--text-gray', currentTheme.textGray);
    root.style.setProperty('--border-color', currentTheme.borderColor);

    root.style.setProperty('--font-main', currentTheme.fontFamily);
    root.style.setProperty('--font-size-base', currentTheme.fontSizeBase);
    root.style.setProperty('--hero-title-size', currentTheme.heroTitleSize);
    root.style.setProperty('--heading-font-weight', currentTheme.headingFontWeight);
    root.style.setProperty('--line-height-base', currentTheme.lineHeightBase);

    root.style.setProperty('--card-border-radius', currentTheme.cardBorderRadius);
    root.style.setProperty('--button-border-radius', currentTheme.buttonBorderRadius);
    root.style.setProperty('--card-border-width', currentTheme.cardBorderWidth);

    root.style.setProperty('--card-shadow', cardShadow);
    root.style.setProperty('--backdrop-blur', currentTheme.backdropBlur);
    root.style.setProperty('--card-hover-lift', currentTheme.cardHoverLift);

    // Section Specific Styles
    const s = currentTheme.sections || defaultSections;
    const t = s.testimonials || defaultSections.testimonials;
    const f = s.faq || defaultSections.faq;
    const p = s.pricing || defaultSections.pricing;
    const h = s.hero || defaultSections.hero;
    const feat = s.features || defaultSections.features;
    const steps = s.howToUse || defaultSections.howToUse;

    // Highlight active section outline rule
    let highlightCss = '';
    if (showHighlight && activeSection && activeSection !== 'global') {
      const activeSelector = defaultSections[activeSection]?.selector || `.${activeSection}`;
      highlightCss = `
        ${activeSelector} {
          outline: 3px dashed #2563EB !important;
          outline-offset: 8px !important;
          position: relative !important;
          transition: outline 0.2s ease !important;
        }
      `;
    }

    // Dynamic style tag
    let styleTag = document.getElementById('safemailz-live-preview-css');
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'safemailz-live-preview-css';
      document.head.appendChild(styleTag);
    }

    styleTag.textContent = `
      body, .landing-page-root {
        background-color: ${currentTheme.pageBg} !important;
        color: ${currentTheme.textDark} !important;
        font-family: ${currentTheme.fontFamily} !important;
      }
      .container {
        max-width: ${currentTheme.containerMaxWidth} !important;
        padding-left: ${currentTheme.containerPaddingX} !important;
        padding-right: ${currentTheme.containerPaddingX} !important;
      }

      /* Global fallback margins & paddings */
      .hero, .page-hero {
        padding-top: ${currentTheme.heroPaddingY} !important;
        padding-bottom: ${currentTheme.heroPaddingY} !important;
        margin-top: ${currentTheme.sectionMarginY} !important;
        margin-bottom: ${currentTheme.sectionMarginY} !important;
      }

      .pricing-card, .feature-card, .how-card, .testimonial-card, .stat-card {
        padding: ${currentTheme.cardPadding} !important;
        border-radius: ${currentTheme.cardBorderRadius} !important;
        background: ${currentTheme.cardBg} !important;
        border: ${currentTheme.cardBorderWidth} solid ${currentTheme.borderColor} !important;
        box-shadow: ${cardShadow} !important;
      }
      .pricing-card:hover, .feature-card:hover, .how-card:hover, .testimonial-card:hover {
        transform: translateY(${currentTheme.cardHoverLift}) !important;
      }
      .landing-page-root .btn-primary, .btn.btn-primary {
        padding: ${currentTheme.buttonPaddingY} ${currentTheme.buttonPaddingX} !important;
        border-radius: ${currentTheme.buttonBorderRadius} !important;
        background: linear-gradient(135deg, ${currentTheme.primaryColor} 0%, ${currentTheme.primaryGradientEnd} 100%) !important;
      }
      .landing-page-root .btn-outline, .btn.btn-outline {
        padding: ${currentTheme.buttonPaddingY} ${currentTheme.buttonPaddingX} !important;
        border-radius: ${currentTheme.buttonBorderRadius} !important;
        border-color: ${currentTheme.primaryColor} !important;
        color: ${currentTheme.primaryColor} !important;
      }
      .pricing-grid, .features-grid, .steps-grid {
        gap: ${currentTheme.cardGap} !important;
      }

      /* ── TARGETED SECTION-SPECIFIC OVERRIDES ─────────────────────────────── */

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

      /* ── SUB-COMPONENT SPECIFIC OVERRIDES (EVERY DIVIDED PART) ────────── */
      ${(() => {
        if (!currentTheme.components || typeof currentTheme.components !== 'object') return '';
        const compMap = {};
        for (const c of pageComponents) compMap[c.id] = c;

        let out = '';
        for (const [id, styles] of Object.entries(currentTheme.components)) {
          if (!styles || typeof styles !== 'object') continue;
          const meta = compMap[id];
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
            out += `\n${meta.selector} {\n  ${rules.join('\n  ')}\n}\n`;
          }
        }
        return out;
      })()}

      /* Visual Active Section Highlight */
      ${highlightCss}

      /* Visual Active Sub-Component Highlight */
      ${(() => {
        if (!showHighlight || !activeComponentId) return '';
        const meta = pageComponents.find(c => c.id === activeComponentId);
        if (!meta || !meta.selector) return '';
        return `
          ${meta.selector} {
            outline: 3px dashed #F59E0B !important;
            outline-offset: 4px !important;
            box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.25) !important;
            position: relative !important;
            transition: outline 0.2s ease, box-shadow 0.2s ease !important;
          }
        `;
      })()}

      /* Custom CSS */
      ${currentTheme.customCss || ''}
    `;
  }, [selectedSection, highlightActiveSection, selectedComponentId]);

  // Fetch saved theme on mount from backend
  useEffect(() => {
    async function fetchTheme() {
      try {
        const res = await fetch('/api/theme');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.theme) {
            const mergedTheme = {
              ...defaultTheme,
              ...data.theme,
              sections: {
                ...defaultSections,
                ...(data.theme.sections || {})
              },
              components: {
                ...(data.theme.components || {})
              }
            };
            setTheme(mergedTheme);
            applyThemeToDom(mergedTheme, selectedSection, highlightActiveSection, selectedComponentId);
          }
        }
      } catch (err) {
        console.warn('[ThemeContext] Could not fetch theme from backend, using defaults:', err);
        applyThemeToDom(defaultTheme, selectedSection, highlightActiveSection, selectedComponentId);
      } finally {
        setLoading(false);
      }
    }
    fetchTheme();
  }, [applyThemeToDom]);

  // Interactive Inspector: click on any element on the page to jump straight to styling it!
  useEffect(() => {
    if (!isInspectorActive) return;

    const handleMouseOver = (e) => {
      // Find matching component
      for (const comp of pageComponents) {
        if (!comp.selector) continue;
        const selectors = comp.selector.split(',').map(s => s.trim());
        for (const s of selectors) {
          try {
            if (e.target.matches(s) || e.target.closest(s)) {
              e.target.style.cursor = 'crosshair';
              return;
            }
          } catch (err) { }
        }
      }
    };

    const handleClick = (e) => {
      // Don't intercept clicks inside the styler drawer itself
      if (e.target.closest('.styler-drawer') || e.target.closest('.styler-floating-trigger') || e.target.closest('.styler-minimized-dock')) {
        return;
      }

      for (const comp of pageComponents) {
        if (!comp.selector) continue;
        const selectors = comp.selector.split(',').map(s => s.trim());
        for (const s of selectors) {
          try {
            if (e.target.matches(s) || e.target.closest(s)) {
              e.preventDefault();
              e.stopPropagation();
              selectComponent(comp.id);
              setIsInspectorActive(false);
              showToast(`🎯 Selected: ${comp.name}`, 'info');
              return;
            }
          } catch (err) { }
        }
      }
    };

    document.addEventListener('mouseover', handleMouseOver, true);
    document.addEventListener('click', handleClick, true);

    return () => {
      document.removeEventListener('mouseover', handleMouseOver, true);
      document.removeEventListener('click', handleClick, true);
    };
  }, [isInspectorActive]);

  // Update a global property in real time
  const updateProperty = (key, value) => {
    setTheme(prev => {
      const next = { ...prev, [key]: value };
      applyThemeToDom(next, selectedSection, highlightActiveSection, selectedComponentId);
      return next;
    });
  };

  // Update a section-specific property (Targeted styling for a single section)
  const updateSectionProperty = (sectionKey, propKey, value) => {
    setTheme(prev => {
      const currentSections = prev.sections || defaultSections;
      const currentSection = currentSections[sectionKey] || defaultSections[sectionKey] || {};
      const updatedSection = { ...currentSection, [propKey]: value };
      const updatedSections = { ...currentSections, [sectionKey]: updatedSection };
      const next = { ...prev, sections: updatedSections };
      applyThemeToDom(next, sectionKey, highlightActiveSection, selectedComponentId);
      return next;
    });
  };

  // Update an individual sub-component property (Every divided part)
  const updateComponentProperty = (componentId, propKey, value) => {
    setTheme(prev => {
      const currentComps = prev.components || {};
      const currentComp = currentComps[componentId] || {};
      const updatedComp = { ...currentComp, [propKey]: value };
      const updatedComps = { ...currentComps, [componentId]: updatedComp };
      const next = { ...prev, components: updatedComps };
      applyThemeToDom(next, selectedSection, highlightActiveSection, componentId);
      return next;
    });
  };

  // Reset a specific section back to default
  const resetSection = (sectionKey) => {
    if (!defaultSections[sectionKey]) return;
    setTheme(prev => {
      const currentSections = prev.sections || defaultSections;
      const updatedSections = { ...currentSections, [sectionKey]: { ...defaultSections[sectionKey] } };
      const next = { ...prev, sections: updatedSections };
      applyThemeToDom(next, sectionKey, highlightActiveSection, selectedComponentId);
      return next;
    });
    showToast(`Reset ${defaultSections[sectionKey].name} styles to baseline`);
  };

  // Reset a specific sub-component back to baseline
  const resetComponent = (componentId) => {
    const meta = pageComponents.find(c => c.id === componentId);
    if (!meta) return;
    setTheme(prev => {
      const currentComps = { ...(prev.components || {}) };
      delete currentComps[componentId];
      const next = { ...prev, components: currentComps };
      applyThemeToDom(next, selectedSection, highlightActiveSection, componentId);
      return next;
    });
    showToast(`Reset ${meta.name} styles to original`);
  };

  // Change active selected section and auto-highlight/scroll
  const selectSection = (sectionKey) => {
    setSelectedSection(sectionKey);
    applyThemeToDom(theme, sectionKey, highlightActiveSection, selectedComponentId);

    if (sectionKey !== 'global') {
      const selector = defaultSections[sectionKey]?.selector?.split(',')[0];
      if (selector) {
        const el = document.querySelector(selector);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  };

  // Select an individual sub-component and scroll it into view
  const selectComponent = (componentId) => {
    setSelectedComponentId(componentId);
    applyThemeToDom(theme, selectedSection, highlightActiveSection, componentId);

    if (componentId) {
      const compMeta = pageComponents.find(c => c.id === componentId);
      if (compMeta && compMeta.selector) {
        const firstSelector = compMeta.selector.split(',')[0].trim();
        const el = document.querySelector(firstSelector);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  };

  // Toggle active outline
  const toggleHighlight = (val) => {
    setHighlightActiveSection(val);
    applyThemeToDom(theme, selectedSection, val, selectedComponentId);
  };

  // Apply a preset theme
  const applyPreset = (presetKey) => {
    const preset = themePresets[presetKey];
    if (!preset) return;
    setTheme(prev => {
      const next = { ...prev, ...preset };
      applyThemeToDom(next, selectedSection, highlightActiveSection, selectedComponentId);
      return next;
    });
    showToast(`Applied "${preset.name}" preset! Click 'Save' to persist to backend.`);
  };

  // Save current theme to backend
  const saveToBackend = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(theme)
      });
      const data = await res.json();
      if (data.success) {
        showToast('Styles successfully saved to backend & persisted across reloads!', 'success');
      } else {
        showToast(data.error || 'Failed to save styles to backend', 'error');
      }
    } catch (err) {
      console.error('[ThemeContext] Save error:', err);
      showToast('Error connecting to backend server', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Reset to default theme
  const resetToDefault = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/theme/reset', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.theme) {
        setTheme(data.theme);
        applyThemeToDom(data.theme, selectedSection, highlightActiveSection, selectedComponentId);
        showToast('Theme reset to factory defaults and saved to backend!', 'success');
      }
    } catch (err) {
      console.error('[ThemeContext] Reset error:', err);
      setTheme(defaultTheme);
      applyThemeToDom(defaultTheme, selectedSection, highlightActiveSection, selectedComponentId);
      showToast('Reset to local defaults', 'info');
    } finally {
      setSaving(false);
    }
  };

  const showToast = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        loading,
        saving,
        notification,
        isEditorOpen,
        setIsEditorOpen,
        pageComponents,
        selectedSection,
        setSelectedSection: selectSection,
        selectedComponentId,
        setSelectedComponentId: selectComponent,
        highlightActiveSection,
        setHighlightActiveSection: toggleHighlight,
        isInspectorActive,
        setIsInspectorActive,
        updateProperty,
        updateSectionProperty,
        updateComponentProperty,
        resetSection,
        resetComponent,
        applyPreset,
        saveToBackend,
        resetToDefault,
        showToast
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
