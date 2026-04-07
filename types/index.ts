// ════════════════════════════════════════════════════════════
// ONELINKER — COMPLETE TYPE DEFINITIONS
// Every interface, type, and enum used across the application.
// No "any" types. Strict TypeScript.
// ════════════════════════════════════════════════════════════

// ── Enums ────────────────────────────────────────────────────

export enum Plan {
  Free = "free",
  Creator = "creator",
  Agency = "agency",
  Enterprise = "enterprise",
}

export enum PostStatus {
  Draft = "draft",
  PendingApproval = "pending_approval",
  Scheduled = "scheduled",
  Published = "published",
  Failed = "failed",
  Cancelled = "cancelled",
}

export enum Platform {
  Twitter = "twitter",
  LinkedIn = "linkedin",
  Instagram = "instagram",
  TikTok = "tiktok",
  Facebook = "facebook",
  Threads = "threads",
  Bluesky = "bluesky",
  YouTube = "youtube",
  Pinterest = "pinterest",
  GoogleBusiness = "google_business",
}

export enum WorkspaceRole {
  Owner = "owner",
  Manager = "manager",
  Editor = "editor",
  Viewer = "viewer",
}

export enum SubscriptionStatus {
  Active = "active",
  PastDue = "past_due",
  Cancelled = "cancelled",
  Trialing = "trialing",
  Paused = "paused",
  Incomplete = "incomplete",
}

export enum NotificationType {
  PostPublished = "post_published",
  PostFailed = "post_failed",
  TeamMemberJoined = "team_member_joined",
  ApprovalRequest = "approval_request",
  ApproachingPostLimit = "approaching_post_limit",
  PaymentFailed = "payment_failed",
  PlanUpgraded = "plan_upgraded",
  PlanDowngraded = "plan_downgraded",
  AccountDisconnected = "account_disconnected",
  InboxMessage = "inbox_message",
}

export enum InboxMessageStatus {
  Unread = "unread",
  Read = "read",
  Replied = "replied",
  Archived = "archived",
}

export enum AiTone {
  Professional = "professional",
  Casual = "casual",
  Funny = "funny",
  Viral = "viral",
  Inspirational = "inspirational",
  Educational = "educational",
}

export enum MediaType {
  Image = "image",
  Video = "video",
  Gif = "gif",
}

export enum ReferralStatus {
  Pending = "pending",
  Converted = "converted",
  Paid = "paid",
}

export enum BillingInterval {
  Monthly = "monthly",
  Yearly = "yearly",
}

// ── Database Row Types ────────────────────────────────────────

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  timezone: string;
  plan: Plan;
  onboarded: boolean;
  phone_verified: boolean;
  referred_by: string | null;
  referral_code: string | null;
  created_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  logo_url: string | null;
  plan: Plan;
  outstand_api_key: string | null;
  created_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  invited_at: string;
  accepted_at: string | null;
}

export interface PostUsage {
  id: string;
  workspace_id: string;
  month: string; // "YYYY-MM"
  post_count: number;
  overage_count: number;
  last_updated: string;
}

export interface SocialAccount {
  id: string;
  workspace_id: string;
  outstand_account_id: string;
  platform: Platform;
  username: string | null;
  display_name: string | null;
  profile_picture: string | null;
  followers_count: number;
  is_active: boolean;
  connected_at: string;
}

export interface Post {
  id: string;
  workspace_id: string;
  author_id: string;
  title?: string | null;
  content: string;
  channel_content?: Record<string, string> | null;
  options?: Record<string, any> | null;
  media_urls: string[];
  platforms: Platform[];
  account_ids: string[];
  status: PostStatus;
  scheduled_at: string | null;
  published_at: string | null;
  outstand_post_id: string | null;
  error_message: string | null;
  first_comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface PostMetrics {
  id: string;
  post_id: string;
  platform: Platform;
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  clicks: number;
  impressions: number;
  recorded_at: string;
}

export interface Queue {
  id: string;
  workspace_id: string;
  name: string;
  platforms: Platform[];
  account_ids: string[];
  is_active: boolean;
  created_at: string;
}

export interface QueueSlot {
  id: string;
  queue_id: string;
  day_of_week: number; // 0 = Sunday, 6 = Saturday
  time_of_day: string; // "HH:MM:SS"
}

export interface QueuePost {
  id: string;
  queue_id: string;
  post_id: string;
  position: number;
}

export interface MediaFile {
  id: string;
  workspace_id: string;
  uploaded_by: string;
  file_url: string;
  outstand_media_id: string | null;
  file_type: string | null;
  file_size: number | null;
  alt_text: string | null;
  created_at: string;
}

export interface InboxMessage {
  id: string;
  workspace_id: string;
  platform: Platform;
  account_id: string | null;
  external_message_id: string | null;
  author_name: string | null;
  author_avatar: string | null;
  content: string | null;
  post_id: string | null;
  status: InboxMessageStatus;
  received_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  workspace_id: string | null;
  type: NotificationType;
  title: string;
  message: string | null;
  read: boolean;
  action_url: string | null;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  workspace_id?: string | null; // deprecated — kept for backward compat
  plan: Plan;
  status: SubscriptionStatus;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  billing_interval: BillingInterval | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  extra_workspaces: number;
  extra_channels: number;
  created_at: string;
}

export interface Invitation {
  id: string;
  workspace_id: string;
  email: string;
  role: WorkspaceRole;
  token: string;
  invited_by: string;
  accepted_at: string | null;
  expires_at: string;
  created_at: string;
}

export interface Referral {
  id: string;
  referrer_id: string;
  referred_id: string;
  status: ReferralStatus;
  commission_amount: number | null;
  created_at: string;
}

export interface PlanLimits {
  plan: Plan;
  max_channels: number | null;
  max_posts_per_month: number | null;
  max_ai_generations: number | null;
  max_team_members: number | null;
  max_workspaces: number | null;
  max_queues: number | null;
  analytics_days: number | null;
  storage_mb: number | null;
  has_inbox: boolean;
  has_approval_workflow: boolean;
  has_white_label: boolean;
  has_api_access: boolean;
  has_csv_export: boolean;
  overage_price_per_100: number | null;
}

// ── Extended / Joined Types ───────────────────────────────────

export interface WorkspaceWithMembers extends Workspace {
  members: WorkspaceMemberWithProfile[];
  subscription: Subscription | null;
  post_usage: PostUsage | null;
}

export interface WorkspaceMemberWithProfile extends WorkspaceMember {
  profile: Profile;
}

export interface PostWithMetrics extends Post {
  metrics: PostMetrics[];
  author: Profile | null;
}

export interface PostWithAccounts extends Post {
  social_accounts: SocialAccount[];
}

export interface QueueWithSlots extends Queue {
  slots: QueueSlot[];
  posts: QueuePost[];
}

export interface SocialAccountWithHealth extends SocialAccount {
  health: AccountHealth;
  last_synced: string | null;
}

export interface InvitationWithWorkspace extends Invitation {
  workspace: Workspace;
  inviter: Profile;
}

// ── UI / State Types ─────────────────────────────────────────

export interface UsageStats {
  posts_used: number;
  posts_limit: number | null;
  ai_used: number;
  ai_limit: number | null;
  channels_used: number;
  channels_limit: number | null;
  storage_used_mb: number;
  storage_limit_mb: number | null;
  team_members_count: number;
  team_limit: number | null;
  workspaces_count: number;
  workspaces_limit: number | null;
  percentage_posts_used: number;
  percentage_ai_used: number;
  percentage_storage_used: number;
}

export type AccountHealth = "healthy" | "warning" | "error" | "disconnected";

export interface UsageWarningLevel {
  level: "safe" | "warning" | "critical" | "blocked";
  percentage: number;
  message: string;
}

export interface PlanFeature {
  name: string;
  description: string;
  included: boolean;
  limit?: string | number | null;
}

export interface PricingPlan {
  id: Plan;
  name: string;
  tagline: string;
  monthlyPrice: number;
  yearlyPrice: number;
  yearlyTotal: number;
  yearlySavings: number;
  features: PlanFeature[];
  highlighted: boolean;
  cta: string;
  stripePriceIdMonthly: string;
  stripePriceIdYearly: string;
}

// ── Composer Types ────────────────────────────────────────────

export interface ComposerState {
  content: string;
  platforms: Platform[];
  account_ids: string[];
  scheduled_at: Date | null;
  timezone: string;
  media_files: MediaFilePreview[];
  first_comment: string;
  is_drafting: boolean;
  ai_tone: AiTone;
  ai_topic: string;
  ai_keywords: string;
  active_preview_platform: Platform | null;
}

export interface MediaFilePreview {
  id: string;
  url: string;
  file: File | null;
  outstand_media_id: string | null;
  type: MediaType;
  size: number;
  uploading: boolean;
  error: string | null;
}

export interface CharacterLimit {
  platform: Platform;
  limit: number;
  current: number;
  remaining: number;
  isOver: boolean;
}

// ── AI Types ──────────────────────────────────────────────────

export interface AiCaptionRequest {
  topic: string;
  tone: AiTone;
  platform: Platform;
  keywords?: string;
  charLimit?: number;
}

export interface AiCaptionResponse {
  variations: string[];
  tokens_used: number;
}

export interface AiHashtagRequest {
  content: string;
  platform: Platform;
}

export interface AiHashtagResponse {
  hashtags: string[];
  tokens_used: number;
}

export interface AiRewriteRequest {
  content: string;
  tone: AiTone;
  platform?: Platform;
}

export interface AiRewriteResponse {
  content: string;
  tokens_used: number;
}

export interface AiContentIdea {
  day: number;
  platform: Platform;
  idea: string;
  suggested_time: string;
}

export interface AiIdeasRequest {
  industry: string;
  topics: string[];
  platforms: Platform[];
}

export interface AiIdeasResponse {
  ideas: AiContentIdea[];
  tokens_used: number;
}

export interface AiRepurposeRequest {
  content: string;
  source_platform: Platform;
  target_platform: Platform;
}

export interface AiRepurposeResponse {
  content: string;
  tokens_used: number;
}

export interface AiInsight {
  title: string;
  description: string;
  action: string;
}

export interface AiInsightsRequest {
  analytics_data: AnalyticsSummary;
}

export interface AiInsightsResponse {
  insights: AiInsight[];
  tokens_used: number;
}

// ── Analytics Types ───────────────────────────────────────────

export interface AnalyticsSummary {
  total_reach: number;
  total_engagement: number;
  engagement_rate: number;
  follower_growth: number;
  posts_published: number;
  top_platform: Platform | null;
  date_range: DateRange;
  platforms: PlatformAnalytics[];
}

export interface PlatformAnalytics {
  platform: Platform;
  reach: number;
  engagement: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  impressions: number;
  follower_growth: number;
  posts_count: number;
}

export interface EngagementDataPoint {
  date: string;
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  clicks: number;
}

export interface FollowerGrowthDataPoint {
  date: string;
  followers: number;
  growth: number;
  platform: Platform;
}

export interface BestTimeDataPoint {
  day_of_week: number; // 0-6
  hour: number; // 0-23
  avg_engagement: number;
}

export interface TopPost {
  post: Post;
  metrics: PostMetrics;
  total_engagement: number;
  engagement_rate: number;
}

export type DateRange = "7d" | "30d" | "90d" | "1y" | "custom";

export interface CustomDateRange {
  from: Date;
  to: Date;
}

// ── Outstand API Types ────────────────────────────────────────

export interface OutstandPostMediaItem {
  url: string;
  filename: string;
}

export interface OutstandPostContainer {
  content: string;
  media?: OutstandPostMediaItem[];
}

export interface OutstandPostRequest {
  containers?: OutstandPostContainer[];
  content?: string;
  accounts: string[]; // outstand account IDs
  scheduledAt?: string; // ISO 8601 (camelCase per Outstand API)
  timezone?: string;
  first_comment?: string;
  // Platform-specific configs (per Outstand API docs)
  instagram?: {
    locationId?: string;
    reelThumbOffset?: number;
    userTags?: Array<{ username: string; x?: number; y?: number }>;
    type?: string; // "STORY" | "REEL" | "POST"
  };
  facebook?: {
    type?: string; // "story" | "reel" | "post"
    reelThumbOffset?: number;
  };
  youtube?: {
    isShort?: boolean;
    categoryId?: string;
    privacyStatus?: "public" | "private" | "unlisted";
    madeForKids?: boolean;
  };
  tiktok?: {
    postMode?: "DIRECT_POST" | "MEDIA_UPLOAD";
    privacyLevel?: string;
    disableComment?: boolean;
    coverThumbOffset?: number;
  };
  // Outstand API uses networkOverrideConfiguration for platform-specific settings
  networkOverrideConfiguration?: {
    youtubeConfiguration?: {
      isShort?: boolean;
      categoryId?: string;
      privacyStatus?: "public" | "private" | "unlisted";
      madeForKids?: boolean;
      tags?: string[];
      title?: string;
      thumbnailUrl?: string;
    };
  };
  // Outstand uses social_account_ids alongside accounts
  social_account_ids?: number[];
}

export interface OutstandPostResponse {
  id: string;
  orgId: string;
  publishedAt: string | null;
  scheduledAt: string | null;
  isDraft: boolean;
  createdAt: string;
  socialAccounts: OutstandAccount[];
  containers: OutstandPostContainer[];
  // Mapped fields for internal use
  content: string;
  accounts: OutstandAccount[];
  status: string;
  schedule_at: string | null;
  created_at: string;
}

export interface OutstandAccount {
  id: string;
  network: string;           // Outstand uses "network" not "platform"
  username: string;
  nickname: string;          // display name in Outstand
  profile_picture_url: string | null;
  accountType: string;
  isActive: boolean;
  createdAt: string;
}

export interface OutstandMediaUploadResponse {
  id: string;
  url: string;
  type: string;
  size: number;
  created_at: string;
}

export interface OutstandAnalyticsResponse {
  post_id: string;
  platform: Platform;
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  clicks: number;
  impressions: number;
  recorded_at: string;
}

export interface OutstandWebhookEvent {
  event: "post.published" | "post.failed" | "account.disconnected";
  data: OutstandWebhookPostData | OutstandWebhookAccountData;
  timestamp: string;
}

export interface OutstandWebhookPostData {
  post_id: string;
  platform: Platform;
  status: "published" | "failed";
  published_at?: string;
  error_message?: string;
}

export interface OutstandWebhookAccountData {
  account_id: string;
  platform: Platform;
  reason: string;
}

// ── API Route Types ───────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  data: T | null;
  error: string | null;
  message: string | null;
  usage?: UsageStats | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
  next_cursor: string | null;
}

export interface PostFilters {
  status?: PostStatus;
  platform?: Platform;
  date_from?: string;
  date_to?: string;
  search?: string;
  cursor?: string;
  per_page?: number;
}

export interface PlanLimitError {
  type: "post_limit" | "channel_limit" | "ai_limit" | "feature_locked" | "storage_limit";
  current: number;
  limit: number | null;
  plan: Plan;
  upgrade_url: string;
  message: string;
}

// ── Stripe Types ──────────────────────────────────────────────

export interface StripeCheckoutRequest {
  plan: Plan;
  interval: BillingInterval;
  success_url?: string;
  cancel_url?: string;
}

export interface StripeCheckoutResponse {
  url: string;
  session_id: string;
}

export interface StripePortalResponse {
  url: string;
}

export interface StripeInvoice {
  id: string;
  amount_paid: number;
  amount_due: number;
  currency: string;
  status: string;
  created: number;
  invoice_pdf: string | null;
  hosted_invoice_url: string | null;
  period_start: number;
  period_end: number;
}

// ── Email Types ───────────────────────────────────────────────

export interface WelcomeEmailData {
  user_name: string;
  user_email: string;
  dashboard_url: string;
}

export interface InviteEmailData {
  inviter_name: string;
  workspace_name: string;
  accept_url: string;
  expires_at: string;
  recipient_email: string;
}

export interface PostFailedEmailData {
  user_name: string;
  post_preview: string;
  platform: Platform;
  error_message: string;
  retry_url: string;
}

export interface WeeklyDigestEmailData {
  user_name: string;
  workspace_name: string;
  posts_published: number;
  total_reach: number;
  top_post_preview: string;
  top_post_engagement: number;
  analytics_url: string;
  week_start: string;
  week_end: string;
}

export interface TrialEndingEmailData {
  user_name: string;
  days_remaining: number;
  upgrade_url: string;
  features_at_risk: string[];
}

export interface PaymentFailedEmailData {
  user_name: string;
  amount: number;
  currency: string;
  card_last4: string;
  update_url: string;
}

export interface PlanUpgradedEmailData {
  user_name: string;
  new_plan: Plan;
  new_features: string[];
  dashboard_url: string;
}

// ── Component Prop Types ──────────────────────────────────────

export interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

export interface PlanGateProps {
  feature: PlanFeatureName;
  requiredPlan?: Plan;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export type PlanFeatureName =
  | "inbox"
  | "approval_workflow"
  | "white_label"
  | "api_access"
  | "csv_export"
  | "client_portals"
  | "unlimited_queues"
  | "best_time_ai"
  | "advanced_analytics"
  | "multiple_workspaces";

export interface UsageBarProps {
  used: number;
  limit: number | null;
  label: string;
  showUpgrade?: boolean;
  size?: "sm" | "md" | "lg";
}

export interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  trigger: "post_limit" | "channel_limit" | "ai_limit" | "feature_locked";
  feature?: PlanFeatureName;
  currentPlan: Plan;
  currentUsage?: number;
  limit?: number;
}

// ── Onboarding Types ──────────────────────────────────────────

export interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  completed: boolean;
}

export interface OnboardingState {
  current_step: number;
  workspace_name: string;
  workspace_logo?: File | null;
  connected_accounts: string[];
  first_post_content: string;
  completed: boolean;
}

// ── Notification Bell Types ───────────────────────────────────

export interface NotificationGroup {
  date: string;
  notifications: Notification[];
}

// ── Workspace Context Types ───────────────────────────────────

export interface WorkspaceContextValue {
  workspace: Workspace | null;
  workspaces: Workspace[];
  member: WorkspaceMember | null;
  subscription: Subscription | null;
  accountPlan: Plan;
  usage: UsageStats | null;
  plan_limits: PlanLimits | null;
  isLoading: boolean;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  refreshUsage: () => Promise<void>;
  refreshWorkspace: () => Promise<void>;
}

// ── Auth Context Types ────────────────────────────────────────

export interface AuthContextValue {
  user: AuthUser | null;
  profile: Profile | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
}

export interface AuthUser {
  id: string;
  email: string;
  email_confirmed_at: string | null;
  phone: string | null;
  created_at: string;
  app_metadata: Record<string, unknown>;
  user_metadata: Record<string, unknown>;
}

// ── Form Schema Types (Zod inferred) ─────────────────────────

export interface LoginFormValues {
  email: string;
  password: string;
}

export interface SignupFormValues {
  full_name: string;
  email: string;
  password: string;
  hcaptcha_token: string;
}

export interface ForgotPasswordFormValues {
  email: string;
}

export interface ResetPasswordFormValues {
  password: string;
  confirm_password: string;
}

export interface CreatePostFormValues {
  content: string;
  platforms: Platform[];
  account_ids: string[];
  scheduled_at: string | null;
  timezone: string;
  media_ids: string[];
  first_comment: string;
}

export interface WorkspaceSettingsFormValues {
  name: string;
  slug: string;
  logo_url?: string | null;
}

export interface InviteMemberFormValues {
  email: string;
  role: WorkspaceRole;
}

export interface ProfileSettingsFormValues {
  full_name: string;
  avatar_url?: string | null;
  timezone: string;
}

export interface QueueFormValues {
  name: string;
  platforms: Platform[];
  account_ids: string[];
  slots: QueueSlotFormValue[];
}

export interface QueueSlotFormValue {
  day_of_week: number;
  time_of_day: string;
}

// ── Calendar Types ────────────────────────────────────────────

export type CalendarView = "month" | "week" | "day";

export interface CalendarEvent {
  id: string;
  post: Post;
  date: Date;
  platforms: Platform[];
  status: PostStatus;
}

export interface CalendarDay {
  date: Date;
  events: CalendarEvent[];
  isToday: boolean;
  isCurrentMonth: boolean;
}

// ── Dashboard Widget Types ────────────────────────────────────

export interface DashboardStats {
  posts_this_month: number;
  posts_limit: number | null;
  scheduled_posts: number;
  published_today: number;
  total_reach_this_week: number;
  reach_change_percent: number;
}

export interface RecentActivityItem {
  id: string;
  type: "post_published" | "post_failed" | "post_scheduled" | "account_connected" | "member_joined";
  message: string;
  timestamp: string;
  platform?: Platform;
  post_id?: string;
}

// ── Media Library Types ───────────────────────────────────────

export type MediaFilter = "all" | "images" | "videos" | "gifs";

export interface MediaLibraryState {
  files: MediaFile[];
  filter: MediaFilter;
  search: string;
  selected: string[];
  storage_used_mb: number;
  storage_limit_mb: number | null;
}

// ── Plan Enforcement ─────────────────────────────────────────

export interface PlanCheckResult {
  allowed: boolean;
  reason?: string;
  current?: number;
  limit?: number | null;
  plan: Plan;
  upgrade_required: boolean;
  error?: PlanLimitError;
}

// ── Rate Limit Types ──────────────────────────────────────────

export interface RateLimitConfig {
  requests: number;
  window: string; // e.g. "1 m", "1 h"
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

// ── Utility Types ─────────────────────────────────────────────

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type AsyncFunction<T = void> = () => Promise<T>;
export type ID = string;

// Deep partial for update operations
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Omit helpers for creating/updating records
export type CreatePost = Omit<Post, "id" | "created_at" | "updated_at" | "published_at" | "outstand_post_id">;
export type UpdatePost = Partial<Omit<Post, "id" | "workspace_id" | "author_id" | "created_at">>;
export type CreateWorkspace = Omit<Workspace, "id" | "created_at">;
export type UpdateWorkspace = Partial<Omit<Workspace, "id" | "owner_id" | "created_at">>;
export type CreateQueue = Omit<Queue, "id" | "created_at">;

// Platform display metadata
export interface PlatformMeta {
  platform: Platform;
  name: string;
  color: string;
  icon: string; // icon component name or emoji
  char_limit: number;
  supports_video: boolean;
  supports_stories: boolean;
  supports_reels: boolean;
  max_images: number;
  max_video_size_mb: number;
}

// All platform metadata constant type
export type PlatformMetaMap = Record<Platform, PlatformMeta>;

// Plan price map type
export interface PlanPrice {
  monthly: number;
  yearly: number;
  yearly_total: number;
  stripe_price_id_monthly: string;
  stripe_price_id_yearly: string;
}

export type PlanPriceMap = Record<Plan, PlanPrice | null>;

// Feature flag map
export type FeatureFlags = Partial<Record<PlanFeatureName, boolean>>;

// Server Action response shape
export type ActionResult<T = void> =
  | { success: true; data: T; error?: never }
  | { success: false; error: string; data?: never };

// Toast notification types
export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastOptions {
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Supabase Realtime types
export interface RealtimePostgresInsertPayload<T> {
  schema: string;
  table: string;
  commit_timestamp: string;
  eventType: "INSERT";
  new: T;
  old: Record<string, never>;
  errors: null;
}

export interface RealtimePostgresUpdatePayload<T> {
  schema: string;
  table: string;
  commit_timestamp: string;
  eventType: "UPDATE";
  new: T;
  old: T;
  errors: null;
}

export interface RealtimePostgresDeletePayload<T> {
  schema: string;
  table: string;
  commit_timestamp: string;
  eventType: "DELETE";
  new: Record<string, never>;
  old: T;
  errors: null;
}
