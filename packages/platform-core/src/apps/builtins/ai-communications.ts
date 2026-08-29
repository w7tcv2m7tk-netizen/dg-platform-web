import type { AppManifest } from "../manifest";

/**
 * Advanced Communications — internal module (not a customer Growth App).
 * Routes stay under /apps/ai-communications/*; operator IA nests under Core Communications.
 * Entitlement: voice_ai premium / legacy ai-communications enable — see hasAdvancedCommsEntitlement.
 */
export const aiCommunicationsApp: AppManifest = {
  id: "ai-communications",
  name: "AI Communications",
  description:
    "Internal advanced Communications module — Voice Agents, Call Centre, Agent Builder, Knowledge, and AI Inbox. Not a customer Growth App; commercialised as Advanced AI Communications (voice_ai).",
  tier: "internal",
  visibility: "internal",
  version: "0.1.0",
  icon: "📡",
  routes: [
    { path: "/apps/ai-communications/voice", label: "Voice Agents" },
    { path: "/apps/ai-communications/call-centre", label: "Call Centre" },
    { path: "/apps/ai-communications/agents", label: "Agent Builder" },
    { path: "/apps/ai-communications/knowledge", label: "Knowledge" },
    { path: "/apps/ai-communications/inbox", label: "AI Inbox" },
    { path: "/apps/ai-communications/settings", label: "Settings" },
  ],
  navigation: [
    {
      href: "/apps/ai-communications/inbox",
      label: "AI Communications",
      icon: "📡",
    },
  ],
  permissions: [
    { id: "comms.view_inbox", label: "View communications inbox" },
    { id: "comms.view_calls", label: "View call centre" },
    { id: "comms.manage_agents", label: "Configure AI agents" },
    { id: "comms.manage_knowledge", label: "Manage knowledge base" },
    { id: "comms.send_messages", label: "Send messages to clients" },
    { id: "comms.view_recordings", label: "View recordings and transcripts" },
    { id: "comms.view_billing", label: "View communications billing" },
  ],
  features: [
    "comms.inbox.read",
    "comms.messages.draft",
    "comms.messages.send",
    "comms.voice.read",
    "comms.voice.inbound",
    "comms.voice.outbound",
    "comms.agents.configure",
    "comms.knowledge.read",
    "comms.knowledge.write",
    "comms.call_centre.read",
    "comms.voice.recording",
    "comms.billing.read",
    "comms.analytics.read",
    "comms.ai.coaching.read",
  ],
  entities: [
    "Contact",
    "Company",
    "Lead",
    "Activity",
    "Task",
    "Document",
    "CommunicationAgent",
    "CommunicationSession",
    "CommunicationMessage",
    "AgentAction",
  ],
  automationTriggers: [
    {
      id: "message.received",
      label: "Inbound message received",
      objectType: "Contact",
    },
    {
      id: "message.sent",
      label: "Outbound message sent",
      objectType: "Contact",
    },
    {
      id: "call.started",
      label: "Call started",
      objectType: "Contact",
    },
    {
      id: "call.completed",
      label: "Call completed",
      objectType: "Contact",
    },
    {
      id: "call.missed",
      label: "Missed call",
      objectType: "Contact",
    },
    {
      id: "appointment.booked",
      label: "Appointment booked via agent",
      objectType: "Contact",
    },
    {
      id: "lead.qualified",
      label: "Lead qualified via voice agent",
      objectType: "Lead",
    },
    {
      id: "lead.no_response",
      label: "Lead no response after follow-up",
      objectType: "Lead",
    },
  ],
  automationActions: [
    { id: "comms.send_email", label: "Send email" },
    { id: "comms.send_sms", label: "Send SMS" },
    { id: "comms.send_whatsapp", label: "Send WhatsApp message" },
    { id: "comms.schedule_followup", label: "Schedule follow-up" },
    { id: "comms.create_task", label: "Create task from call outcome" },
    { id: "comms.assign_agent", label: "Assign to team member" },
    { id: "comms.escalate", label: "Escalate to human" },
    { id: "comms.notify_team", label: "Notify team member" },
  ],
  aiTools: [
    {
      id: "comms.draft_reply",
      label: "Draft reply",
      description: "Draft an email or SMS reply using contact and thread context",
    },
    {
      id: "comms.summarise_thread",
      label: "Summarise conversation",
      description: "Summarise a contact's communication history",
    },
    {
      id: "comms.summarise_call",
      label: "Summarise call",
      description: "Generate call summary from transcript",
    },
    {
      id: "comms.extract_actions",
      label: "Extract next actions",
      description: "Identify follow-up tasks from a call or message thread",
    },
    {
      id: "comms.coaching_feedback",
      label: "Coaching feedback",
      description: "Analyse call quality and suggest improvements",
    },
    {
      id: "comms.sentiment_analysis",
      label: "Analyse sentiment",
      description: "Score customer sentiment from transcript or message",
    },
  ],
  reports: [
    { id: "comms.volume_report", label: "Communications volume" },
    { id: "comms.voice_performance", label: "Voice agent performance" },
    { id: "comms.conversion_report", label: "Booking & conversion report" },
    { id: "comms.labour_savings", label: "Estimated labour savings" },
  ],
};
