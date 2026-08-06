/** Dark theme aligned with DigitalGate client portal — tuned for WCAG contrast */
export const clerkAppearance = {
  variables: {
    colorPrimary: "#3b82f6",
    colorBackground: "#020617",
    colorInputBackground: "#1e293b",
    colorInputText: "#f8fafc",
    colorText: "#f8fafc",
    colorTextSecondary: "#e2e8f0",
    colorDanger: "#f87171",
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "w-full",
    card: "bg-slate-900 border border-slate-600 shadow-2xl shadow-black/40",
    header: "text-white",
    headerTitle: "text-white text-xl font-semibold tracking-tight",
    headerSubtitle: "text-slate-200",
    formHeaderTitle: "text-white text-lg font-semibold tracking-tight",
    formHeaderSubtitle: "text-slate-200",
    backLink: "text-slate-200 hover:text-white",
    backRow: "text-slate-200",
    socialButtonsBlockButton:
      "border border-slate-500 bg-slate-800 text-white hover:bg-slate-700",
    socialButtonsBlockButtonText: "text-white font-medium",
    formButtonPrimary:
      "bg-blue-600 hover:bg-blue-500 text-white rounded-full normal-case font-semibold shadow-sm",
    footerActionLink: "text-blue-200 hover:text-white font-medium",
    footerActionText: "text-slate-200",
    footerPagesLink: "text-slate-300 hover:text-white",
    identityPreviewEditButton: "text-blue-200 hover:text-white",
    identityPreviewText: "text-white",
    formFieldLabel: "text-slate-100 font-medium",
    formFieldInput:
      "bg-slate-800 border-slate-500 text-white placeholder:text-slate-400 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30",
    formFieldHintText: "text-slate-400",
    formFieldErrorText: "text-red-400",
    formFieldSuccessText: "text-emerald-400",
    dividerLine: "bg-slate-600",
    dividerText: "text-slate-300",
    alertText: "text-slate-100",
    otpCodeFieldInput:
      "bg-slate-800 border-slate-500 text-white rounded-xl focus:border-blue-400",
    alternativeMethodsBlockButtonText: "text-white",
    formResendCodeLink: "text-blue-200 hover:text-white font-medium",
  },
};
