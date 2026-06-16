{
  "meta": {
    "product": "KSeF Invoicing (Poland) — Business SaaS Dashboard",
    "tone": ["premium", "trustworthy", "fast", "compliance-first"],
    "mobile_first": true,
    "notes": [
      "Respect user palette: dark sidebar (#0f172a) + light content bg (#f8fafc), indigo-600 primary, emerald-500 success, rose-500 error, amber-500 pending.",
      "All interactive + key informational elements MUST include data-testid (kebab-case).",
      "Project uses .js components (not .tsx).",
      "Use shadcn/ui components from /app/frontend/src/components/ui as primary primitives."
    ]
  },

  "brand_attributes": {
    "keywords": ["clarity", "auditability", "speed", "financial confidence"],
    "visual_metaphors": [
      "Ledger-like tables (zebra + sticky headers)",
      "Paper-trust A4 preview (white page on neutral canvas)",
      "Status-first UI (badges + timeline + queue states)"
    ]
  },

  "typography": {
    "font_pairing": {
      "ui_sans": {
        "name": "Manrope",
        "fallback": "ui-sans-serif, system-ui",
        "usage": "All UI text, labels, navigation"
      },
      "mono_numeric": {
        "name": "IBM Plex Mono",
        "fallback": "ui-monospace, SFMono-Regular",
        "usage": "Amounts, KPIs, invoice numbers, KSeF IDs"
      }
    },
    "implementation": {
      "google_fonts": [
        "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
      ],
      "tailwind_usage": {
        "body": "font-sans",
        "numbers": "font-mono tabular-nums",
        "headings": "font-semibold tracking-tight"
      }
    },
    "type_scale": {
      "h1": "text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight",
      "h2": "text-base md:text-lg font-semibold text-slate-700 dark:text-slate-200",
      "body": "text-sm md:text-base text-slate-700 dark:text-slate-200",
      "small": "text-xs text-slate-500 dark:text-slate-400",
      "kpi_value": "text-2xl md:text-3xl font-mono font-semibold tabular-nums",
      "table": "text-sm",
      "form_label": "text-xs font-medium text-slate-600 dark:text-slate-300"
    }
  },

  "color_system": {
    "palette_locked_by_user": {
      "sidebar_bg": "#0f172a",
      "content_bg": "#f8fafc",
      "primary": "#4f46e5 (indigo-600)",
      "success": "#10b981 (emerald-500)",
      "danger": "#f43f5e (rose-500)",
      "warning": "#f59e0b (amber-500)"
    },
    "semantic_tokens": {
      "light": {
        "bg": "#f8fafc",
        "surface": "#ffffff",
        "surface_2": "#f1f5f9",
        "text": "#0f172a",
        "text_muted": "#475569",
        "border": "#e2e8f0",
        "ring": "#4f46e5",
        "sidebar": {
          "bg": "#0f172a",
          "text": "#e2e8f0",
          "text_muted": "#94a3b8",
          "hover": "rgba(255,255,255,0.06)",
          "active": "rgba(79,70,229,0.18)",
          "active_border": "rgba(79,70,229,0.55)"
        }
      },
      "dark": {
        "bg": "#0b1220",
        "surface": "#0f172a",
        "surface_2": "#111c33",
        "text": "#e5e7eb",
        "text_muted": "#94a3b8",
        "border": "rgba(148,163,184,0.18)",
        "ring": "#6366f1",
        "sidebar": {
          "bg": "#0b1220",
          "text": "#e5e7eb",
          "text_muted": "#94a3b8",
          "hover": "rgba(255,255,255,0.06)",
          "active": "rgba(99,102,241,0.18)",
          "active_border": "rgba(99,102,241,0.55)"
        },
        "a4_canvas": "#0b1220",
        "a4_page": "#ffffff"
      }
    },
    "charts": {
      "revenue": "indigo-600",
      "expenses": "slate-400",
      "vat": "amber-500",
      "profit": "emerald-500",
      "overdue": "rose-500"
    },
    "gradients_and_texture": {
      "allowed_usage": [
        "Only as subtle section background accents (<=20% viewport)",
        "Never on text-heavy areas, never on small UI elements"
      ],
      "recommended": [
        "Hero/dashboard header wash: from-slate-50 via-white to-slate-50 (light)",
        "Dark header wash: from-slate-950 via-slate-900 to-slate-950 (dark)"
      ],
      "noise_overlay": {
        "css": "background-image: url('data:image/svg+xml,%3Csvg xmlns=\"http://www.w3.org/2000/svg\" width=\"120\" height=\"120\"%3E%3Cfilter id=\"n\"%3E%3CfeTurbulence type=\"fractalNoise\" baseFrequency=\"0.8\" numOctaves=\"3\" stitchTiles=\"stitch\"/%3E%3C/filter%3E%3Crect width=\"120\" height=\"120\" filter=\"url(%23n)\" opacity=\"0.06\"/%3E%3C/svg%3E');"
      }
    }
  },

  "design_tokens_css": {
    "where": "/app/frontend/src/index.css (extend :root and .dark)",
    "tokens": {
      "radius": {
        "--radius": "12px",
        "--radius-sm": "10px",
        "--radius-lg": "16px"
      },
      "shadow": {
        "--shadow-card": "0 1px 2px rgba(15,23,42,0.06)",
        "--shadow-popover": "0 12px 30px rgba(15,23,42,0.18)",
        "--shadow-focus": "0 0 0 4px rgba(79,70,229,0.18)"
      },
      "spacing": {
        "page_padding": "px-4 sm:px-6 lg:px-8",
        "section_gap": "space-y-6",
        "card_padding": "p-4 sm:p-5",
        "dense_row": "py-2.5"
      },
      "motion": {
        "--ease-out": "cubic-bezier(0.16, 1, 0.3, 1)",
        "--dur-1": "120ms",
        "--dur-2": "180ms",
        "--dur-3": "240ms"
      }
    },
    "tailwind_motion_rules": {
      "never": ["transition-all"],
      "use_instead": [
        "transition-colors duration-150",
        "transition-opacity duration-150",
        "transition-shadow duration-150",
        "transition-[background-color,border-color,color,box-shadow] duration-150"
      ]
    }
  },

  "layout": {
    "app_shell": {
      "sidebar": {
        "width": "240px",
        "desktop": "fixed left-0 top-0 h-dvh",
        "mobile": "collapses to Drawer/Sheet",
        "classes": "bg-[#0f172a] text-slate-200 border-r border-white/10",
        "nav_item": {
          "base": "group flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-200/90",
          "hover": "hover:bg-white/5 hover:text-white transition-colors",
          "active": "bg-indigo-500/15 text-white ring-1 ring-inset ring-indigo-400/30",
          "active_indicator": "before:content-[''] before:absolute before:left-0 before:h-6 before:w-1 before:rounded-r before:bg-indigo-400"
        },
        "sections": [
          "Dashboard",
          "Faktury sprzedaży",
          "Wydatki",
          "Klienci",
          "Moje firmy",
          "Szablony",
          "Raporty",
          "Ustawienia"
        ]
      },
      "topbar": {
        "height": "56px",
        "classes": "sticky top-0 z-30 bg-white/80 dark:bg-slate-950/40 backdrop-blur border-b border-slate-200 dark:border-white/10",
        "left": "mobile sidebar trigger + breadcrumb",
        "center": "global search input",
        "right": "notifications bell + language toggle + theme toggle + user menu"
      },
      "content": {
        "max_width": "max-w-[1400px]",
        "classes": "min-h-[calc(100dvh-56px)] bg-slate-50 dark:bg-[#0b1220]",
        "grid": "Use 12-col grid on lg; stack on mobile"
      }
    },
    "dashboard_grid": {
      "kpis": "grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4",
      "charts_row": "grid grid-cols-1 lg:grid-cols-12 gap-4",
      "charts_allocation": {
        "bar_chart": "lg:col-span-7",
        "pie_charts": "lg:col-span-3",
        "gauge": "lg:col-span-2"
      },
      "tables_row": "grid grid-cols-1 lg:grid-cols-12 gap-4",
      "recent_invoices": "lg:col-span-8",
      "right_stack": "lg:col-span-4 space-y-4"
    }
  },

  "components": {
    "component_path": {
      "shadcn": {
        "button": "/app/frontend/src/components/ui/button.jsx",
        "badge": "/app/frontend/src/components/ui/badge.jsx",
        "card": "/app/frontend/src/components/ui/card.jsx",
        "table": "/app/frontend/src/components/ui/table.jsx",
        "tabs": "/app/frontend/src/components/ui/tabs.jsx",
        "dialog": "/app/frontend/src/components/ui/dialog.jsx",
        "drawer_sheet": [
          "/app/frontend/src/components/ui/drawer.jsx",
          "/app/frontend/src/components/ui/sheet.jsx"
        ],
        "command_palette": "/app/frontend/src/components/ui/command.jsx",
        "dropdown": "/app/frontend/src/components/ui/dropdown-menu.jsx",
        "popover": "/app/frontend/src/components/ui/popover.jsx",
        "select": "/app/frontend/src/components/ui/select.jsx",
        "calendar": "/app/frontend/src/components/ui/calendar.jsx",
        "scroll_area": "/app/frontend/src/components/ui/scroll-area.jsx",
        "separator": "/app/frontend/src/components/ui/separator.jsx",
        "tooltip": "/app/frontend/src/components/ui/tooltip.jsx",
        "sonner_toasts": "/app/frontend/src/components/ui/sonner.jsx"
      },
      "custom_to_create": {
        "app_shell": "src/components/layout/AppShell.js",
        "sidebar": "src/components/layout/SidebarNav.js",
        "topbar": "src/components/layout/Topbar.js",
        "kpi_card": "src/components/dashboard/KpiCard.js",
        "charts": {
          "bar": "src/components/charts/BarChartMini.js",
          "pie": "src/components/charts/PieChartMini.js",
          "gauge": "src/components/charts/HealthGauge.js"
        },
        "invoice_editor": {
          "fullscreen_modal": "src/components/invoices/InvoiceEditorModal.js",
          "a4_preview": "src/components/invoices/A4InvoicePreview.js",
          "vat_summary": "src/components/invoices/VatSummaryByRate.js",
          "audit_timeline": "src/components/invoices/InvoiceAuditTimeline.js"
        },
        "widgets": {
          "vat_calculator": "src/components/widgets/VatCalculatorWidget.js",
          "notifications": "src/components/widgets/NotificationsBell.js",
          "command_palette": "src/components/widgets/CommandPalette.js"
        }
      }
    },

    "buttons": {
      "shape": "rounded-lg (8–12px feel)",
      "variants": {
        "primary": {
          "classes": "bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2",
          "data_testid_examples": ["invoice-create-button", "ksef-send-button"]
        },
        "secondary": {
          "classes": "bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-100 dark:hover:bg-white/15",
          "data_testid_examples": ["invoice-duplicate-button"]
        },
        "ghost": {
          "classes": "hover:bg-slate-100 dark:hover:bg-white/10",
          "data_testid_examples": ["topbar-notifications-button"]
        },
        "danger": {
          "classes": "bg-rose-500 text-white hover:bg-rose-600",
          "data_testid_examples": ["invoice-cancel-button"]
        }
      },
      "micro_interactions": [
        "Hover: transition-colors + subtle shadow on primary only (transition-shadow duration-150)",
        "Active: scale-[0.99] (apply only on button press via active:scale-[0.99])",
        "Loading: inline spinner left of label; keep width stable"
      ]
    },

    "cards": {
      "base": "rounded-xl border border-slate-200 bg-white shadow-[var(--shadow-card)] dark:border-white/10 dark:bg-slate-950/30",
      "kpi_card": {
        "layout": "icon + label + value + delta",
        "classes": "p-4 sm:p-5",
        "delta": {
          "positive": "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-300",
          "negative": "text-rose-600 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-300"
        },
        "data_testid_examples": [
          "kpi-monthly-revenue-value",
          "kpi-vat-to-pay-value",
          "kpi-net-profit-value"
        ]
      }
    },

    "tables": {
      "pattern": "Dense, zebra, sticky header, row hover actions",
      "container": "rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-950/30 overflow-hidden",
      "header": "sticky top-0 z-10 bg-slate-50/95 backdrop-blur dark:bg-slate-950/70",
      "row": {
        "zebra": "odd:bg-white even:bg-slate-50/60 dark:odd:bg-transparent dark:even:bg-white/5",
        "hover": "hover:bg-indigo-50/60 dark:hover:bg-indigo-500/10 transition-colors",
        "selected": "bg-indigo-50 dark:bg-indigo-500/10"
      },
      "cells": {
        "amount": "font-mono tabular-nums text-right",
        "muted": "text-slate-500 dark:text-slate-400"
      },
      "empty_state": {
        "copy_pl": "Brak dokumentów. Utwórz pierwszą fakturę lub zaimportuj dane.",
        "cta": "Utwórz fakturę",
        "data_testid_examples": ["invoices-empty-create-button"]
      }
    },

    "status_badges": {
      "use": "shadcn Badge with custom variants via className",
      "mapping": {
        "Szkic": "bg-slate-100 text-slate-700 border border-slate-200 dark:bg-white/10 dark:text-slate-200 dark:border-white/10",
        "Wystawiona": "bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-200 dark:border-indigo-400/20",
        "Wysłana": "bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-500/10 dark:text-sky-200 dark:border-sky-400/20",
        "Zapłacona": "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:border-emerald-400/20",
        "Przeterminowana": "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-200 dark:border-rose-400/20",
        "Anulowana": "bg-slate-200 text-slate-700 border border-slate-300 dark:bg-white/10 dark:text-slate-300 dark:border-white/10",
        "Oczekuje": "bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:border-amber-400/20"
      },
      "data_testid_examples": ["invoice-status-badge"]
    },

    "forms": {
      "layout": "Use sections with separators; labels above inputs; helper text below",
      "inputs": {
        "classes": "bg-white dark:bg-slate-950/30",
        "focus": "focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2",
        "error": "ring-2 ring-rose-500/40 border-rose-300"
      },
      "nip_validation": {
        "pattern": "Inline validation next to field + tooltip for details",
        "states": {
          "checking": "spinner + 'Sprawdzanie…'",
          "valid": "emerald icon + 'NIP poprawny'",
          "invalid": "rose icon + 'Nieprawidłowy NIP'"
        },
        "data_testid_examples": ["client-nip-input", "client-gus-lookup-button"]
      }
    },

    "invoice_editor_fullscreen": {
      "container": "Dialog full-screen (or Sheet from right on mobile)",
      "desktop_layout": "grid grid-cols-12 gap-4 h-[calc(100dvh-2rem)]",
      "left_form": "col-span-7 overflow-y-auto pr-1",
      "right_preview": "col-span-5",
      "mobile_layout": "Tabs: 'Formularz' and 'Podgląd A4'",
      "sections_left": [
        "Kontrahent (buyer)",
        "Sprzedawca (seller / company)",
        "Pozycje (items table)",
        "Podsumowanie VAT (grouped by rate)",
        "MPP banner (if applicable)",
        "Uwagi / płatność / termin",
        "KSeF: token status + send button + response"
      ],
      "a4_preview": {
        "canvas": "bg-slate-100 dark:bg-[#0b1220] rounded-xl border border-slate-200 dark:border-white/10 p-3",
        "page": "bg-white text-slate-900 rounded-lg shadow-sm mx-auto",
        "page_size": "w-[794px] h-[1123px] (A4 @96dpi) scale down responsively",
        "typography": "Use font-sans for labels, font-mono for numbers; keep 10–12px print-like sizes",
        "details": [
          "Header: invoice number + issue date + sale date",
          "Seller/Buyer blocks: two columns",
          "Items table: thin borders, right-aligned amounts",
          "VAT summary table grouped by rate",
          "Amount in words line",
          "Payment info + bank account",
          "KSeF metadata footer (KSeF ID, sent timestamp)"
        ],
        "data_testid_examples": ["invoice-a4-preview"]
      }
    },

    "charts_handbuilt": {
      "bar_chart": {
        "style": "Rounded bars, subtle gridlines, axis labels muted",
        "classes": "h-56",
        "gridline": "stroke-slate-200 dark:stroke-white/10",
        "bar_revenue": "fill-indigo-600",
        "bar_expenses": "fill-slate-400 dark:fill-slate-500",
        "tooltip": "Popover with month + values (mono)"
      },
      "pie_charts": {
        "style": "Donut with center label; legend right; hover slice lifts via translate",
        "colors": ["indigo-600", "emerald-500", "amber-500", "slate-400", "rose-500"],
        "empty": "Show ring outline + 'Brak danych'"
      },
      "health_gauge": {
        "style": "Semi-circle gauge with 3 zones (rose/amber/emerald) + needle",
        "label": "Kondycja finansowa",
        "data_testid_examples": ["financial-health-gauge"]
      }
    },

    "command_palette": {
      "use": "shadcn Command + Dialog",
      "trigger": "Ctrl+K + topbar button",
      "items": [
        "Utwórz fakturę",
        "Dodaj wydatek",
        "Znajdź klienta",
        "Wyślij do KSeF",
        "Eksport CSV",
        "Przełącz firmę",
        "Przełącz język PL/EN",
        "Tryb ciemny/jasny"
      ],
      "data_testid_examples": ["command-palette-open-button", "command-palette-input"]
    },

    "notifications": {
      "pattern": "Bell icon with unread dot; dropdown list grouped by Today/Older",
      "items": [
        "KSeF: dokument przyjęty",
        "KSeF: odrzucony — wymaga korekty",
        "Płatność: termin za 3 dni",
        "Faktura przeterminowana"
      ],
      "data_testid_examples": ["notifications-bell-button"]
    },

    "vat_calculator_widget": {
      "pattern": "Floating draggable-ish widget (simple fixed bottom-right) with mini form",
      "placement": "fixed bottom-4 right-4 (avoid covering table pagination)",
      "states": ["collapsed", "expanded"],
      "classes": "rounded-xl border border-slate-200 bg-white shadow-lg dark:border-white/10 dark:bg-slate-950/60 backdrop-blur",
      "data_testid_examples": ["vat-calculator-toggle-button", "vat-calculator-net-input"]
    },

    "toasts": {
      "library": "sonner",
      "rules": [
        "Use short Polish copy; include invoice number in mono",
        "Success: emerald accent; Error: rose accent; Warning: amber accent"
      ]
    }
  },

  "motion": {
    "principles": [
      "Fast, subtle, functional (no playful bounces)",
      "Prefer opacity + translateY(4px) entrance for panels",
      "Avoid universal transitions (no transition-all)"
    ],
    "page_transition": {
      "classes": "animate-in fade-in-0 slide-in-from-bottom-1 duration-200",
      "reduced_motion": "Respect prefers-reduced-motion: remove translate"
    },
    "micro_interactions": {
      "sidebar": "Hover highlight + icon tint; active item ring",
      "table_rows": "Hover background only; show row actions on hover (opacity transition)",
      "charts": "On hover: tooltip fade-in; slice lift (pie)"
    }
  },

  "accessibility": {
    "requirements": [
      "Keyboard navigation for sidebar, command palette, dialogs",
      "Visible focus ring (indigo) on all interactive elements",
      "ARIA labels for icon-only buttons",
      "WCAG AA contrast for text on surfaces",
      "Use semantic table markup via shadcn Table"
    ],
    "data_testid_policy": {
      "rule": "Every interactive + key informational element must have data-testid",
      "naming": "kebab-case describing role",
      "examples": [
        "sidebar-nav-dashboard-link",
        "topbar-global-search-input",
        "invoice-list-filter-status-select",
        "invoice-editor-save-button",
        "invoice-total-gross-value",
        "ksef-status-pill"
      ]
    }
  },

  "images": {
    "image_urls": [
      {
        "category": "brand",
        "description": "No stock photos needed; keep product UI-first. Optional subtle abstract background only.",
        "urls": []
      }
    ]
  },

  "instructions_to_main_agent": [
    "Remove default CRA App.css centering patterns; do not center the whole app container.",
    "Update /app/frontend/src/index.css tokens to match semantic system above (keep shadcn variable structure).",
    "Implement AppShell with fixed 240px sidebar on desktop and Sheet/Drawer on mobile.",
    "Use shadcn Table with sticky header + zebra striping; ensure row hover actions.",
    "Invoice creation: full-screen Dialog on desktop with 12-col split (form left, A4 preview right); on mobile use Tabs to switch between form and preview.",
    "Hand-build charts with SVG/div; keep colors mapped to tokens; tooltips via Popover.",
    "Implement command palette using shadcn Command + Dialog; bind Ctrl+K.",
    "Add floating VAT calculator widget fixed bottom-right with collapse/expand.",
    "Ensure dark mode: A4 preview remains white page on dark canvas; sidebar stays slate.",
    "Add data-testid to all interactive and key informational elements across pages."
  ],

  "general_ui_ux_design_guidelines_appendix": "<General UI UX Design Guidelines>\n    - You must **not** apply universal transition. Eg: `transition: all`. This results in breaking transforms. Always add transitions for specific interactive elements like button, input excluding transforms\n    - You must **not** center align the app container, ie do not add `.App { text-align: center; }` in the css file. This disrupts the human natural reading flow of text\n   - NEVER: use AI assistant Emoji characters like`🤖🧠💭💡🔮🎯📚🎭🎬🎪🎉🎊🎁🎀🎂🍰🎈🎨🎰💰💵💳🏦💎🪙💸🤑📊📈📉💹🔢🏆🥇 etc for icons. Always use **FontAwesome cdn** or **lucid-react** library already installed in the package.json\n\n **GRADIENT RESTRICTION RULE**\nNEVER use dark/saturated gradient combos (e.g., purple/pink) on any UI element.  Prohibited gradients: blue-500 to purple 600, purple 500 to pink-500, green-500 to blue-500, red to pink etc\nNEVER use dark gradients for logo, testimonial, footer etc\nNEVER let gradients cover more than 20% of the viewport.\nNEVER apply gradients to text-heavy content or reading areas.\nNEVER use gradients on small UI elements (<100px width).\nNEVER stack multiple gradient layers in the same viewport.\n\n**ENFORCEMENT RULE:**\n    • Id gradient area exceeds 20% of viewport OR affects readability, **THEN** use solid colors\n\n**How and where to use:**\n   • Section backgrounds (not content backgrounds)\n   • Hero section header content. Eg: dark to light to dark color\n   • Decorative overlays and accent elements only\n   • Hero section with 2-3 mild color\n   • Gradients creation can be done for any angle say horizontal, vertical or diagonal\n\n- For AI chat, voice application, **do not use purple color. Use color like light green, ocean blue, peach orange etc**\n\n</Font Guidelines>\n\n- Every interaction needs micro-animations - hover states, transitions, parallax effects, and entrance animations. Static = dead. \n   \n- Use 2-3x more spacing than feels comfortable. Cramped designs look cheap.\n\n- Subtle grain textures, noise overlays, custom cursors, selection states, and loading animations: separates good from extraordinary.\n   \n- Before generating UI, infer the visual style from the problem statement (palette, contrast, mood, motion) and immediately instantiate it by setting global design tokens (primary, secondary/accent, background, foreground, ring, state colors), rather than relying on any library defaults. Don't make the background dark as a default step, always understand problem first and define colors accordingly\n    Eg: - if it implies playful/energetic, choose a colorful scheme\n           - if it implies monochrome/minimal, choose a black–white/neutral scheme\n\n**Component Reuse:**\n\t- Prioritize using pre-existing components from src/components/ui when applicable\n\t- Create new components that match the style and conventions of existing components when needed\n\t- Examine existing components to understand the project's component patterns before creating new ones\n\n**IMPORTANT**: Do not use HTML based component like dropdown, calendar, toast etc. You **MUST** always use `/app/frontend/src/components/ui/ ` only as a primary components as these are modern and stylish component\n\n**Best Practices:**\n\t- Use Shadcn/UI as the primary component library for consistency and accessibility\n\t- Import path: ./components/[component-name]\n\n**Export Conventions:**\n\t- Components MUST use named exports (export const ComponentName = ...)\n\t- Pages MUST use default exports (export default function PageName() {...})\n\n**Toasts:**\n  - Use `sonner` for toasts\"\n  - Sonner component are located in `/app/src/components/ui/sonner.tsx`\n\nUse 2–4 color gradients, subtle textures/noise overlays, or CSS-based noise to avoid flat visuals.\n</General UI UX Design Guidelines>"
}
