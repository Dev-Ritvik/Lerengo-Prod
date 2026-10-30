export type UserRole = "user" | "senior" | "admin" | "superadmin";
export type MentorCategory = "faculty" | "senior" | "career";
export type PaymentStatus = "created" | "success" | "failed";
export type DoubtStatus = "open" | "assigned" | "resolved";
export type VerificationStatus = "pending" | "approved" | "rejected";
export type MentorshipModerationState = "visible" | "flagged" | "hidden";
export type MentorshipRequestType =
  | "session"
  | "roadmap"
  | "office_hour"
  | "boost"
  | "portfolio"
  | "blocker";
export type MentorshipRequestStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "cancelled"
  | "completed";
export type MentorshipReportTargetType = "doubt" | "reply";
export type MentorshipReportStatus = "open" | "reviewed" | "dismissed";
export type NotificationType =
  | "mentorship_request"
  | "mentorship_request_update"
  | "mentorship_message"
  | "mentorship_report"
  | "doubt_reply"
  | "system";
export type CommunityChannel = "Projects" | "Research" | "Exams" | "Labs";
export type CommunityModerationState = "reviewed" | "flagged" | "verified" | "pinned";
export type CommunityPartnerStatus = "open" | "matched" | "closed";
export type CommunityReportStatus = "open" | "reviewed" | "dismissed";
export type CampusWeeklyItemType = "banner" | "announcement";
export type CampusWeeklyTargetType = "external" | "community_post";
export type CampusWeeklyCategory =
  | "hackathon"
  | "event"
  | "workshop"
  | "opportunity"
  | "announcement"
  | "bulletin";
export type CourseProgramType =
  | "Course"
  | "Specialization"
  | "Professional Certificate"
  | "Learning Path";
export type CourseSpotlightBucket = "popular" | "weekly" | "ai" | "new";
export type CourseEnrollmentStatus = "active" | "completed" | "paused" | "cancelled";
export type CourseLessonType = "video" | "reading" | "lab";
export type CourseAssessmentKind = "checkpoint" | "final";
export type LabIdeaStage = "idea" | "research" | "prototype" | "paper" | "patent" | "build";
export type LabSupportTrack =
  | "validation"
  | "research"
  | "prototype"
  | "publication"
  | "patent"
  | "mentorship";
export type LabPriority = "standard" | "priority" | "critical";
export type LabSubmissionStatus =
  | "submitted"
  | "under_review"
  | "accepted"
  | "rejected"
  | "active_build"
  | "research_track"
  | "publication_track"
  | "patent_track"
  | "showcase";
export type MentorVerificationStatus = "draft" | "submitted" | "approved" | "rejected" | "suspended";
export type MentorType =
  | "industry_expert"
  | "faculty"
  | "alumni"
  | "senior_student"
  | "founder"
  | "operator"
  | "other";
export type MentorBookingStatus =
  | "draft"
  | "pending_payment"
  | "payment_failed"
  | "pending_mentor_approval"
  | "confirmed"
  | "reschedule_requested"
  | "cancelled_by_student"
  | "cancelled_by_mentor"
  | "completed"
  | "no_show"
  | "refunded"
  | "disputed";
export type MentorPaymentStatus =
  | "not_required"
  | "pending"
  | "paid"
  | "failed"
  | "refunded"
  | "partial_refund";
export type MentorReviewModerationStatus = "pending" | "approved" | "rejected" | "hidden";
export type HunterDiscoverability = "private" | "lerengo_only" | "verified_recruiters" | "public_link";
export type HunterContactVisibility =
  | "hidden"
  | "after_invite_acceptance"
  | "public_to_verified_recruiters";
export type HunterVerificationStatus = "pending" | "verified" | "rejected" | "suspended";
export type HunterOpportunityStatus = "draft" | "pending_review" | "published" | "paused" | "closed" | "archived";
export type HunterLocationMode = "remote" | "hybrid" | "onsite";
export type HunterInviteStatus = "sent" | "viewed" | "accepted" | "declined" | "expired" | "withdrawn";
export type HunterPipelineStage =
  | "invited"
  | "interested"
  | "applied"
  | "screening"
  | "interview"
  | "offer"
  | "hired"
  | "rejected"
  | "withdrawn";

export type Database = {
  public: {
    Tables: {
      universities: {
        Row: {
          created_at: string;
          domain: string | null;
          id: string;
          is_active: boolean;
          keywords: string[];
          min_score: number;
          name: string;
          name_variants: string[];
          reg_id_regex: string[];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          domain?: string | null;
          id?: string;
          is_active?: boolean;
          keywords?: string[];
          min_score?: number;
          name: string;
          name_variants?: string[];
          reg_id_regex?: string[];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          domain?: string | null;
          id?: string;
          is_active?: boolean;
          keywords?: string[];
          min_score?: number;
          name?: string;
          name_variants?: string[];
          reg_id_regex?: string[];
          updated_at?: string;
        };
        Relationships: [];
      };
      users: {
        Row: {
          admin_user_id: string | null;
          banned_at: string | null;
          banned_by: string | null;
          banned_reason: string | null;
          batch: string | null;
          campus_name: string | null;
          created_at: string;
          department: string | null;
          email: string;
          full_name: string | null;
          id: string;
          is_banned: boolean;
          mentor_active: boolean;
          mentor_approved: boolean;
          mentor_category: MentorCategory | null;
          mentor_expertise: string[];
          mentor_headline: string | null;
          program_domain: string | null;
          reg_id_hash: string | null;
          reg_id_last4: string | null;
          role: UserRole;
          university_id: string | null;
          updated_at: string;
          verified: boolean;
          verified_at: string | null;
        };
        Insert: {
          admin_user_id?: string | null;
          banned_at?: string | null;
          banned_by?: string | null;
          banned_reason?: string | null;
          batch?: string | null;
          campus_name?: string | null;
          created_at?: string;
          department?: string | null;
          email: string;
          full_name?: string | null;
          id: string;
          is_banned?: boolean;
          mentor_active?: boolean;
          mentor_approved?: boolean;
          mentor_category?: MentorCategory | null;
          mentor_expertise?: string[];
          mentor_headline?: string | null;
          program_domain?: string | null;
          reg_id_hash?: string | null;
          reg_id_last4?: string | null;
          role?: UserRole;
          university_id?: string | null;
          updated_at?: string;
          verified?: boolean;
          verified_at?: string | null;
        };
        Update: {
          admin_user_id?: string | null;
          banned_at?: string | null;
          banned_by?: string | null;
          banned_reason?: string | null;
          batch?: string | null;
          campus_name?: string | null;
          created_at?: string;
          department?: string | null;
          email?: string;
          full_name?: string | null;
          id?: string;
          is_banned?: boolean;
          mentor_active?: boolean;
          mentor_approved?: boolean;
          mentor_category?: MentorCategory | null;
          mentor_expertise?: string[];
          mentor_headline?: string | null;
          program_domain?: string | null;
          reg_id_hash?: string | null;
          reg_id_last4?: string | null;
          role?: UserRole;
          university_id?: string | null;
          updated_at?: string;
          verified?: boolean;
          verified_at?: string | null;
        };
        Relationships: [];
      };
      admin_audit_log: {
        Row: {
          action: string;
          actor_email: string | null;
          actor_id: string | null;
          created_at: string;
          id: string;
          metadata: Record<string, unknown>;
          summary: string | null;
          target_id: string | null;
          target_table: string | null;
        };
        Insert: {
          action: string;
          actor_email?: string | null;
          actor_id?: string | null;
          created_at?: string;
          id?: string;
          metadata?: Record<string, unknown>;
          summary?: string | null;
          target_id?: string | null;
          target_table?: string | null;
        };
        Update: {
          action?: string;
          actor_email?: string | null;
          actor_id?: string | null;
          created_at?: string;
          id?: string;
          metadata?: Record<string, unknown>;
          summary?: string | null;
          target_id?: string | null;
          target_table?: string | null;
        };
        Relationships: [];
      };
      notes: {
        Row: {
          archived_at: string | null;
          archived_by: string | null;
          content_json: Record<string, unknown>;
          created_at: string;
          department: string | null;
          description: string | null;
          file_path: string | null;
          id: string;
          is_verified: boolean;
          price_inr: number;
          program_domain: string | null;
          semester: number | null;
          subject: string | null;
          title: string;
          university_id: string;
          uploaded_by: string | null;
          updated_at: string;
          video_url: string | null;
        };
        Insert: {
          archived_at?: string | null;
          archived_by?: string | null;
          content_json?: Record<string, unknown>;
          created_at?: string;
          department?: string | null;
          description?: string | null;
          file_path?: string | null;
          id?: string;
          is_verified?: boolean;
          price_inr?: number;
          program_domain?: string | null;
          semester?: number | null;
          subject?: string | null;
          title: string;
          university_id: string;
          uploaded_by?: string | null;
          updated_at?: string;
          video_url?: string | null;
        };
        Update: {
          archived_at?: string | null;
          archived_by?: string | null;
          content_json?: Record<string, unknown>;
          created_at?: string;
          department?: string | null;
          description?: string | null;
          file_path?: string | null;
          id?: string;
          is_verified?: boolean;
          price_inr?: number;
          program_domain?: string | null;
          semester?: number | null;
          subject?: string | null;
          title?: string;
          university_id?: string;
          uploaded_by?: string | null;
          updated_at?: string;
          video_url?: string | null;
        };
        Relationships: [];
      };
      note_assessment_attempts: {
        Row: {
          answers_json: Record<string, unknown>;
          created_at: string;
          id: string;
          note_id: string;
          passed: boolean;
          score_percent: number;
          submitted_at: string;
          university_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          answers_json?: Record<string, unknown>;
          created_at?: string;
          id?: string;
          note_id: string;
          passed?: boolean;
          score_percent?: number;
          submitted_at?: string;
          university_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          answers_json?: Record<string, unknown>;
          created_at?: string;
          id?: string;
          note_id?: string;
          passed?: boolean;
          score_percent?: number;
          submitted_at?: string;
          university_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "note_assessment_attempts_note_id_fkey";
            columns: ["note_id"];
            isOneToOne: false;
            referencedRelation: "notes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "note_assessment_attempts_university_id_fkey";
            columns: ["university_id"];
            isOneToOne: false;
            referencedRelation: "universities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "note_assessment_attempts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      academic_subject_mappings: {
        Row: {
          created_at: string;
          department: string;
          id: string;
          is_active: boolean;
          program_domain: string;
          semester: number;
          subject: string;
          university_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          department: string;
          id?: string;
          is_active?: boolean;
          program_domain: string;
          semester: number;
          subject: string;
          university_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          department?: string;
          id?: string;
          is_active?: boolean;
          program_domain?: string;
          semester?: number;
          subject?: string;
          university_id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      note_access: {
        Row: {
          granted_at: string;
          id: string;
          note_id: string;
          payment_id: string | null;
          user_id: string;
        };
        Insert: {
          granted_at?: string;
          id?: string;
          note_id: string;
          payment_id?: string | null;
          user_id: string;
        };
        Update: {
          granted_at?: string;
          id?: string;
          note_id?: string;
          payment_id?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          amount_paise: number;
          created_at: string;
          id: string;
          note_id: string;
          razorpay_order_id: string;
          razorpay_payment_id: string | null;
          razorpay_signature: string | null;
          status: PaymentStatus;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          amount_paise: number;
          created_at?: string;
          id?: string;
          note_id: string;
          razorpay_order_id: string;
          razorpay_payment_id?: string | null;
          razorpay_signature?: string | null;
          status?: PaymentStatus;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          amount_paise?: number;
          created_at?: string;
          id?: string;
          note_id?: string;
          razorpay_order_id?: string;
          razorpay_payment_id?: string | null;
          razorpay_signature?: string | null;
          status?: PaymentStatus;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      doubts: {
        Row: {
          assigned_to: string | null;
          created_at: string;
          description: string;
          id: string;
          moderation_state: MentorshipModerationState;
          status: DoubtStatus;
          title: string;
          university_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          assigned_to?: string | null;
          created_at?: string;
          description: string;
          id?: string;
          moderation_state?: MentorshipModerationState;
          status?: DoubtStatus;
          title: string;
          university_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          assigned_to?: string | null;
          created_at?: string;
          description?: string;
          id?: string;
          moderation_state?: MentorshipModerationState;
          status?: DoubtStatus;
          title?: string;
          university_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      doubt_replies: {
        Row: {
          body: string;
          created_at: string;
          doubt_id: string;
          id: string;
          moderation_state: MentorshipModerationState;
          university_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          doubt_id: string;
          id?: string;
          moderation_state?: MentorshipModerationState;
          university_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          doubt_id?: string;
          id?: string;
          moderation_state?: MentorshipModerationState;
          university_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      mentorship_requests: {
        Row: {
          created_at: string;
          id: string;
          mentor_id: string;
          message: string | null;
          requester_id: string;
          request_type: MentorshipRequestType;
          response_note: string | null;
          scheduled_for: string | null;
          status: MentorshipRequestStatus;
          university_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          mentor_id: string;
          message?: string | null;
          requester_id: string;
          request_type: MentorshipRequestType;
          response_note?: string | null;
          scheduled_for?: string | null;
          status?: MentorshipRequestStatus;
          university_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          mentor_id?: string;
          message?: string | null;
          requester_id?: string;
          request_type?: MentorshipRequestType;
          response_note?: string | null;
          scheduled_for?: string | null;
          status?: MentorshipRequestStatus;
          university_id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      mentorship_reports: {
        Row: {
          created_at: string;
          doubt_id: string | null;
          id: string;
          reason: string;
          reporter_id: string;
          reply_id: string | null;
          review_note: string | null;
          reviewed_by: string | null;
          status: MentorshipReportStatus;
          target_type: MentorshipReportTargetType;
          university_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          doubt_id?: string | null;
          id?: string;
          reason: string;
          reporter_id: string;
          reply_id?: string | null;
          review_note?: string | null;
          reviewed_by?: string | null;
          status?: MentorshipReportStatus;
          target_type: MentorshipReportTargetType;
          university_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          doubt_id?: string | null;
          id?: string;
          reason?: string;
          reporter_id?: string;
          reply_id?: string | null;
          review_note?: string | null;
          reviewed_by?: string | null;
          status?: MentorshipReportStatus;
          target_type?: MentorshipReportTargetType;
          university_id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      mentorship_messages: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          read_at: string | null;
          recipient_id: string;
          request_id: string;
          sender_id: string;
          university_id: string;
          updated_at: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          id?: string;
          read_at?: string | null;
          recipient_id: string;
          request_id: string;
          sender_id: string;
          university_id: string;
          updated_at?: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          read_at?: string | null;
          recipient_id?: string;
          request_id?: string;
          sender_id?: string;
          university_id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          body: string;
          created_at: string;
          href: string | null;
          id: string;
          read_at: string | null;
          title: string;
          type: NotificationType;
          university_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          href?: string | null;
          id?: string;
          read_at?: string | null;
          title: string;
          type: NotificationType;
          university_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          href?: string | null;
          id?: string;
          read_at?: string | null;
          title?: string;
          type?: NotificationType;
          university_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      community_posts: {
        Row: {
          badge_label: string | null;
          channel: CommunityChannel;
          created_at: string;
          helpful_count: number;
          highlight_subtitle: string | null;
          highlight_title: string | null;
          id: string;
          is_weekly_highlight: boolean;
          moderation_state: CommunityModerationState;
          program_domain: string | null;
          reply_count: number;
          status_label: string;
          summary: string;
          tags: string[];
          title: string;
          topic: string | null;
          trust_score: number;
          university_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          badge_label?: string | null;
          channel: CommunityChannel;
          created_at?: string;
          helpful_count?: number;
          highlight_subtitle?: string | null;
          highlight_title?: string | null;
          id?: string;
          is_weekly_highlight?: boolean;
          moderation_state?: CommunityModerationState;
          program_domain?: string | null;
          reply_count?: number;
          status_label?: string;
          summary: string;
          tags?: string[];
          title: string;
          topic?: string | null;
          trust_score?: number;
          university_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          badge_label?: string | null;
          channel?: CommunityChannel;
          created_at?: string;
          helpful_count?: number;
          highlight_subtitle?: string | null;
          highlight_title?: string | null;
          id?: string;
          is_weekly_highlight?: boolean;
          moderation_state?: CommunityModerationState;
          program_domain?: string | null;
          reply_count?: number;
          status_label?: string;
          summary?: string;
          tags?: string[];
          title?: string;
          topic?: string | null;
          trust_score?: number;
          university_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      campus_weekly_items: {
        Row: {
          category: CampusWeeklyCategory;
          community_post_id: string | null;
          created_at: string;
          created_by: string | null;
          cta_label: string | null;
          description: string | null;
          ends_at: string | null;
          eyebrow: string | null;
          id: string;
          is_active: boolean;
          item_type: CampusWeeklyItemType;
          meta_label: string | null;
          pill_label: string | null;
          sort_order: number;
          starts_at: string | null;
          subtitle: string | null;
          target_type: CampusWeeklyTargetType;
          target_url: string | null;
          title: string;
          university_id: string;
          updated_at: string;
        };
        Insert: {
          category: CampusWeeklyCategory;
          community_post_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          cta_label?: string | null;
          description?: string | null;
          ends_at?: string | null;
          eyebrow?: string | null;
          id?: string;
          is_active?: boolean;
          item_type: CampusWeeklyItemType;
          meta_label?: string | null;
          pill_label?: string | null;
          sort_order?: number;
          starts_at?: string | null;
          subtitle?: string | null;
          target_type: CampusWeeklyTargetType;
          target_url?: string | null;
          title: string;
          university_id: string;
          updated_at?: string;
        };
        Update: {
          category?: CampusWeeklyCategory;
          community_post_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          cta_label?: string | null;
          description?: string | null;
          ends_at?: string | null;
          eyebrow?: string | null;
          id?: string;
          is_active?: boolean;
          item_type?: CampusWeeklyItemType;
          meta_label?: string | null;
          pill_label?: string | null;
          sort_order?: number;
          starts_at?: string | null;
          subtitle?: string | null;
          target_type?: CampusWeeklyTargetType;
          target_url?: string | null;
          title?: string;
          university_id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      community_partner_requests: {
        Row: {
          created_at: string;
          description: string;
          id: string;
          matched_by: string | null;
          open_roles: string;
          skills: string[];
          status: CommunityPartnerStatus;
          team_size_label: string;
          title: string;
          university_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          description: string;
          id?: string;
          matched_by?: string | null;
          open_roles: string;
          skills?: string[];
          status?: CommunityPartnerStatus;
          team_size_label: string;
          title: string;
          university_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          description?: string;
          id?: string;
          matched_by?: string | null;
          open_roles?: string;
          skills?: string[];
          status?: CommunityPartnerStatus;
          team_size_label?: string;
          title?: string;
          university_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      community_reports: {
        Row: {
          created_at: string;
          id: string;
          post_id: string;
          reason: string;
          review_note: string | null;
          reviewed_by: string | null;
          status: CommunityReportStatus;
          university_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          post_id: string;
          reason: string;
          review_note?: string | null;
          reviewed_by?: string | null;
          status?: CommunityReportStatus;
          university_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          post_id?: string;
          reason?: string;
          review_note?: string | null;
          reviewed_by?: string | null;
          status?: CommunityReportStatus;
          university_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      community_post_votes: {
        Row: {
          created_at: string;
          id: string;
          post_id: string;
          university_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          post_id: string;
          university_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          post_id?: string;
          university_id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      community_comment_votes: {
        Row: {
          comment_id: string;
          created_at: string;
          id: string;
          university_id: string;
          user_id: string;
        };
        Insert: {
          comment_id: string;
          created_at?: string;
          id?: string;
          university_id: string;
          user_id: string;
        };
        Update: {
          comment_id?: string;
          created_at?: string;
          id?: string;
          university_id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      community_comments: {
        Row: {
          body: string;
          created_at: string;
          helpful_count: number;
          id: string;
          parent_id: string | null;
          post_id: string;
          university_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          helpful_count?: number;
          id?: string;
          parent_id?: string | null;
          post_id: string;
          university_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          helpful_count?: number;
          id?: string;
          parent_id?: string | null;
          post_id?: string;
          university_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      courses: {
        Row: {
          category: string;
          created_at: string;
          description: string;
          duration_label: string;
          enrollment_count: number;
          focus_area: string;
          hero_slot: number | null;
          id: string;
          is_published: boolean;
          list_price_inr: number | null;
          outcomes: string[];
          pace_label: string;
          price_inr: number;
          program_type: CourseProgramType;
          provider_code: string;
          provider_name: string;
          rating: number;
          skill_level: string;
          skills: string[];
          slug: string;
          sort_order: number;
          spotlight_bucket: CourseSpotlightBucket | null;
          subtitle: string | null;
          summary: string;
          syllabus: string[];
          tags: string[];
          title: string;
          updated_at: string;
        };
        Insert: {
          category: string;
          created_at?: string;
          description: string;
          duration_label: string;
          enrollment_count?: number;
          focus_area: string;
          hero_slot?: number | null;
          id?: string;
          is_published?: boolean;
          list_price_inr?: number | null;
          outcomes?: string[];
          pace_label?: string;
          price_inr?: number;
          program_type: CourseProgramType;
          provider_code: string;
          provider_name: string;
          rating?: number;
          skill_level?: string;
          skills?: string[];
          slug: string;
          sort_order?: number;
          spotlight_bucket?: CourseSpotlightBucket | null;
          subtitle?: string | null;
          summary: string;
          syllabus?: string[];
          tags?: string[];
          title: string;
          updated_at?: string;
        };
        Update: {
          category?: string;
          created_at?: string;
          description?: string;
          duration_label?: string;
          enrollment_count?: number;
          focus_area?: string;
          hero_slot?: number | null;
          id?: string;
          is_published?: boolean;
          list_price_inr?: number | null;
          outcomes?: string[];
          pace_label?: string;
          price_inr?: number;
          program_type?: CourseProgramType;
          provider_code?: string;
          provider_name?: string;
          rating?: number;
          skill_level?: string;
          skills?: string[];
          slug?: string;
          sort_order?: number;
          spotlight_bucket?: CourseSpotlightBucket | null;
          subtitle?: string | null;
          summary?: string;
          syllabus?: string[];
          tags?: string[];
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      course_enrollments: {
        Row: {
          course_id: string;
          created_at: string;
          id: string;
          last_accessed_at: string | null;
          progress_percent: number;
          source: string;
          started_at: string;
          status: CourseEnrollmentStatus;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          course_id: string;
          created_at?: string;
          id?: string;
          last_accessed_at?: string | null;
          progress_percent?: number;
          source?: string;
          started_at?: string;
          status?: CourseEnrollmentStatus;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          course_id?: string;
          created_at?: string;
          id?: string;
          last_accessed_at?: string | null;
          progress_percent?: number;
          source?: string;
          started_at?: string;
          status?: CourseEnrollmentStatus;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "course_enrollments_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "course_enrollments_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      course_modules: {
        Row: {
          course_id: string;
          created_at: string;
          id: string;
          sort_order: number;
          summary: string | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          course_id: string;
          created_at?: string;
          id?: string;
          sort_order?: number;
          summary?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          course_id?: string;
          created_at?: string;
          id?: string;
          sort_order?: number;
          summary?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "course_modules_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
      course_lessons: {
        Row: {
          created_at: string;
          duration_minutes: number | null;
          id: string;
          is_preview: boolean;
          lesson_type: CourseLessonType;
          module_id: string;
          sort_order: number;
          summary: string | null;
          title: string;
          updated_at: string;
          video_url: string | null;
        };
        Insert: {
          created_at?: string;
          duration_minutes?: number | null;
          id?: string;
          is_preview?: boolean;
          lesson_type?: CourseLessonType;
          module_id: string;
          sort_order?: number;
          summary?: string | null;
          title: string;
          updated_at?: string;
          video_url?: string | null;
        };
        Update: {
          created_at?: string;
          duration_minutes?: number | null;
          id?: string;
          is_preview?: boolean;
          lesson_type?: CourseLessonType;
          module_id?: string;
          sort_order?: number;
          summary?: string | null;
          title?: string;
          updated_at?: string;
          video_url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "course_lessons_module_id_fkey";
            columns: ["module_id"];
            isOneToOne: false;
            referencedRelation: "course_modules";
            referencedColumns: ["id"];
          },
        ];
      };
      course_assessments: {
        Row: {
          course_id: string;
          created_at: string;
          duration_minutes: number;
          id: string;
          kind: CourseAssessmentKind;
          max_attempts: number;
          pass_percent: number;
          questions_json: Record<string, unknown>[];
          summary: string | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          course_id: string;
          created_at?: string;
          duration_minutes?: number;
          id?: string;
          kind?: CourseAssessmentKind;
          max_attempts?: number;
          pass_percent?: number;
          questions_json?: Record<string, unknown>[];
          summary?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          course_id?: string;
          created_at?: string;
          duration_minutes?: number;
          id?: string;
          kind?: CourseAssessmentKind;
          max_attempts?: number;
          pass_percent?: number;
          questions_json?: Record<string, unknown>[];
          summary?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "course_assessments_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
      course_assessment_attempts: {
        Row: {
          answers_json: Record<string, unknown>;
          assessment_id: string;
          course_id: string;
          created_at: string;
          id: string;
          passed: boolean;
          score_percent: number;
          submitted_at: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          answers_json?: Record<string, unknown>;
          assessment_id: string;
          course_id: string;
          created_at?: string;
          id?: string;
          passed?: boolean;
          score_percent?: number;
          submitted_at?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          answers_json?: Record<string, unknown>;
          assessment_id?: string;
          course_id?: string;
          created_at?: string;
          id?: string;
          passed?: boolean;
          score_percent?: number;
          submitted_at?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "course_assessment_attempts_assessment_id_fkey";
            columns: ["assessment_id"];
            isOneToOne: false;
            referencedRelation: "course_assessments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "course_assessment_attempts_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "course_assessment_attempts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      course_certificates: {
        Row: {
          certificate_number: string;
          course_id: string;
          created_at: string;
          id: string;
          issued_at: string;
          recipient_name: string;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          certificate_number: string;
          course_id: string;
          created_at?: string;
          id?: string;
          issued_at?: string;
          recipient_name: string;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          certificate_number?: string;
          course_id?: string;
          created_at?: string;
          id?: string;
          issued_at?: string;
          recipient_name?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "course_certificates_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "course_certificates_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      course_payments: {
        Row: {
          amount_paise: number;
          course_id: string;
          created_at: string;
          currency: string;
          id: string;
          payment_provider: string;
          razorpay_order_id: string;
          razorpay_payment_id: string | null;
          status: PaymentStatus;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          amount_paise: number;
          course_id: string;
          created_at?: string;
          currency?: string;
          id?: string;
          payment_provider?: string;
          razorpay_order_id: string;
          razorpay_payment_id?: string | null;
          status?: PaymentStatus;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          amount_paise?: number;
          course_id?: string;
          created_at?: string;
          currency?: string;
          id?: string;
          payment_provider?: string;
          razorpay_order_id?: string;
          razorpay_payment_id?: string | null;
          status?: PaymentStatus;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "course_payments_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "course_payments_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      lab_submissions: {
        Row: {
          assigned_to: string | null;
          created_at: string;
          domain: string;
          idea_stage: LabIdeaStage;
          id: string;
          last_reviewed_at: string | null;
          links: string[];
          next_step: string | null;
          patent_interest: boolean;
          priority: LabPriority;
          problem_statement: string;
          publication_interest: boolean;
          review_notes: string | null;
          reviewed_by: string | null;
          skills_snapshot: string | null;
          status: LabSubmissionStatus;
          submission_summary: string;
          support_tracks: LabSupportTrack[];
          team_context: string | null;
          title: string;
          university_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          assigned_to?: string | null;
          created_at?: string;
          domain: string;
          idea_stage?: LabIdeaStage;
          id?: string;
          last_reviewed_at?: string | null;
          links?: string[];
          next_step?: string | null;
          patent_interest?: boolean;
          priority?: LabPriority;
          problem_statement: string;
          publication_interest?: boolean;
          review_notes?: string | null;
          reviewed_by?: string | null;
          skills_snapshot?: string | null;
          status?: LabSubmissionStatus;
          submission_summary: string;
          support_tracks?: LabSupportTrack[];
          team_context?: string | null;
          title: string;
          university_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          assigned_to?: string | null;
          created_at?: string;
          domain?: string;
          idea_stage?: LabIdeaStage;
          id?: string;
          last_reviewed_at?: string | null;
          links?: string[];
          next_step?: string | null;
          patent_interest?: boolean;
          priority?: LabPriority;
          problem_statement?: string;
          publication_interest?: boolean;
          review_notes?: string | null;
          reviewed_by?: string | null;
          skills_snapshot?: string | null;
          status?: LabSubmissionStatus;
          submission_summary?: string;
          support_tracks?: LabSupportTrack[];
          team_context?: string | null;
          title?: string;
          university_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lab_submissions_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lab_submissions_university_id_fkey";
            columns: ["university_id"];
            isOneToOne: false;
            referencedRelation: "universities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lab_submissions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      mentor_profiles: {
        Row: {
          admin_notes: string | null;
          affiliation: string | null;
          average_rating: number | null;
          city: string | null;
          country: string | null;
          created_at: string;
          credentials: Record<string, unknown>;
          display_name: string;
          expertise_tags: string[];
          headline: string;
          id: string;
          industries: string[];
          is_published: boolean;
          languages: string[];
          long_bio: string;
          mentor_type: MentorType;
          profile_image_url: string | null;
          review_count: number;
          reviewed_at: string | null;
          reviewed_by: string | null;
          short_bio: string;
          skills: string[];
          slug: string;
          social_links: Record<string, unknown>;
          starting_price: number | null;
          timezone: string;
          updated_at: string;
          user_id: string;
          verification_status: MentorVerificationStatus;
        };
        Insert: {
          admin_notes?: string | null;
          affiliation?: string | null;
          average_rating?: number | null;
          city?: string | null;
          country?: string | null;
          created_at?: string;
          credentials?: Record<string, unknown>;
          display_name: string;
          expertise_tags?: string[];
          headline: string;
          id?: string;
          industries?: string[];
          is_published?: boolean;
          languages?: string[];
          long_bio: string;
          mentor_type?: MentorType;
          profile_image_url?: string | null;
          review_count?: number;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          short_bio: string;
          skills?: string[];
          slug: string;
          social_links?: Record<string, unknown>;
          starting_price?: number | null;
          timezone?: string;
          updated_at?: string;
          user_id: string;
          verification_status?: MentorVerificationStatus;
        };
        Update: {
          admin_notes?: string | null;
          affiliation?: string | null;
          average_rating?: number | null;
          city?: string | null;
          country?: string | null;
          created_at?: string;
          credentials?: Record<string, unknown>;
          display_name?: string;
          expertise_tags?: string[];
          headline?: string;
          id?: string;
          industries?: string[];
          is_published?: boolean;
          languages?: string[];
          long_bio?: string;
          mentor_type?: MentorType;
          profile_image_url?: string | null;
          review_count?: number;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          short_bio?: string;
          skills?: string[];
          slug?: string;
          social_links?: Record<string, unknown>;
          starting_price?: number | null;
          timezone?: string;
          updated_at?: string;
          user_id?: string;
          verification_status?: MentorVerificationStatus;
        };
        Relationships: [
          {
            foreignKeyName: "mentor_profiles_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "mentor_profiles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      mentor_session_types: {
        Row: {
          created_at: string;
          currency: string;
          description: string;
          duration_minutes: number;
          id: string;
          is_active: boolean;
          mentor_profile_id: string;
          outcomes: string[];
          price_amount: number;
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          currency?: string;
          description: string;
          duration_minutes: number;
          id?: string;
          is_active?: boolean;
          mentor_profile_id: string;
          outcomes?: string[];
          price_amount: number;
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          currency?: string;
          description?: string;
          duration_minutes?: number;
          id?: string;
          is_active?: boolean;
          mentor_profile_id?: string;
          outcomes?: string[];
          price_amount?: number;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mentor_session_types_mentor_profile_id_fkey";
            columns: ["mentor_profile_id"];
            isOneToOne: false;
            referencedRelation: "mentor_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      mentor_bookings: {
        Row: {
          admin_notes: string | null;
          booking_status: MentorBookingStatus;
          cancellation_reason: string | null;
          created_at: string;
          currency: string;
          end_at: string;
          id: string;
          meeting_link: string | null;
          mentor_payout_amount: number;
          mentor_profile_id: string;
          payment_provider: string;
          payment_reference: string | null;
          payment_status: MentorPaymentStatus;
          platform_fee_amount: number;
          price_amount: number;
          session_goal: string;
          session_type_id: string | null;
          start_at: string;
          student_context: string | null;
          student_user_id: string;
          timezone_snapshot: string;
          updated_at: string;
        };
        Insert: {
          admin_notes?: string | null;
          booking_status?: MentorBookingStatus;
          cancellation_reason?: string | null;
          created_at?: string;
          currency?: string;
          end_at: string;
          id?: string;
          meeting_link?: string | null;
          mentor_payout_amount?: number;
          mentor_profile_id: string;
          payment_provider?: string;
          payment_reference?: string | null;
          payment_status?: MentorPaymentStatus;
          platform_fee_amount?: number;
          price_amount: number;
          session_goal: string;
          session_type_id?: string | null;
          start_at: string;
          student_context?: string | null;
          student_user_id: string;
          timezone_snapshot?: string;
          updated_at?: string;
        };
        Update: {
          admin_notes?: string | null;
          booking_status?: MentorBookingStatus;
          cancellation_reason?: string | null;
          created_at?: string;
          currency?: string;
          end_at?: string;
          id?: string;
          meeting_link?: string | null;
          mentor_payout_amount?: number;
          mentor_profile_id?: string;
          payment_provider?: string;
          payment_reference?: string | null;
          payment_status?: MentorPaymentStatus;
          platform_fee_amount?: number;
          price_amount?: number;
          session_goal?: string;
          session_type_id?: string | null;
          start_at?: string;
          student_context?: string | null;
          student_user_id?: string;
          timezone_snapshot?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mentor_bookings_mentor_profile_id_fkey";
            columns: ["mentor_profile_id"];
            isOneToOne: false;
            referencedRelation: "mentor_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "mentor_bookings_session_type_id_fkey";
            columns: ["session_type_id"];
            isOneToOne: false;
            referencedRelation: "mentor_session_types";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "mentor_bookings_student_user_id_fkey";
            columns: ["student_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      hunter_talent_profiles: {
        Row: {
          admin_notes: string | null;
          contact_visibility: HunterContactVisibility;
          created_at: string;
          discoverability: HunterDiscoverability;
          headline: string;
          id: string;
          is_active: boolean;
          open_to_types: string[];
          portfolio_url: string | null;
          preferred_locations: string[];
          proof_links: Record<string, unknown>[];
          resume_url: string | null;
          skills: string[];
          summary: string | null;
          target_roles: string[];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          admin_notes?: string | null;
          contact_visibility?: HunterContactVisibility;
          created_at?: string;
          discoverability?: HunterDiscoverability;
          headline: string;
          id?: string;
          is_active?: boolean;
          open_to_types?: string[];
          portfolio_url?: string | null;
          preferred_locations?: string[];
          proof_links?: Record<string, unknown>[];
          resume_url?: string | null;
          skills?: string[];
          summary?: string | null;
          target_roles?: string[];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          admin_notes?: string | null;
          contact_visibility?: HunterContactVisibility;
          created_at?: string;
          discoverability?: HunterDiscoverability;
          headline?: string;
          id?: string;
          is_active?: boolean;
          open_to_types?: string[];
          portfolio_url?: string | null;
          preferred_locations?: string[];
          proof_links?: Record<string, unknown>[];
          resume_url?: string | null;
          skills?: string[];
          summary?: string | null;
          target_roles?: string[];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "hunter_talent_profiles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      hunter_companies: {
        Row: {
          admin_notes: string | null;
          company_size: string | null;
          created_at: string;
          description: string | null;
          id: string;
          industry: string | null;
          name: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
          updated_at: string;
          verification_status: HunterVerificationStatus;
          website: string;
        };
        Insert: {
          admin_notes?: string | null;
          company_size?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          industry?: string | null;
          name: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          updated_at?: string;
          verification_status?: HunterVerificationStatus;
          website: string;
        };
        Update: {
          admin_notes?: string | null;
          company_size?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          industry?: string | null;
          name?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          updated_at?: string;
          verification_status?: HunterVerificationStatus;
          website?: string;
        };
        Relationships: [
          {
            foreignKeyName: "hunter_companies_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      hunter_recruiter_profiles: {
        Row: {
          admin_notes: string | null;
          company_id: string | null;
          created_at: string;
          display_name: string;
          hiring_intent: string;
          id: string;
          invites_sent_this_month: number;
          monthly_invite_quota: number;
          reviewed_at: string | null;
          reviewed_by: string | null;
          title: string | null;
          updated_at: string;
          user_id: string;
          verification_status: HunterVerificationStatus;
          work_email: string;
        };
        Insert: {
          admin_notes?: string | null;
          company_id?: string | null;
          created_at?: string;
          display_name: string;
          hiring_intent: string;
          id?: string;
          invites_sent_this_month?: number;
          monthly_invite_quota?: number;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          title?: string | null;
          updated_at?: string;
          user_id: string;
          verification_status?: HunterVerificationStatus;
          work_email: string;
        };
        Update: {
          admin_notes?: string | null;
          company_id?: string | null;
          created_at?: string;
          display_name?: string;
          hiring_intent?: string;
          id?: string;
          invites_sent_this_month?: number;
          monthly_invite_quota?: number;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          title?: string | null;
          updated_at?: string;
          user_id?: string;
          verification_status?: HunterVerificationStatus;
          work_email?: string;
        };
        Relationships: [
          {
            foreignKeyName: "hunter_recruiter_profiles_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "hunter_companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "hunter_recruiter_profiles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      hunter_opportunities: {
        Row: {
          admin_notes: string | null;
          company_id: string | null;
          compensation_label: string | null;
          created_at: string;
          description: string;
          id: string;
          location_label: string | null;
          location_mode: HunterLocationMode;
          opportunity_type: string;
          recruiter_profile_id: string;
          required_skills: string[];
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: HunterOpportunityStatus;
          title: string;
          updated_at: string;
        };
        Insert: {
          admin_notes?: string | null;
          company_id?: string | null;
          compensation_label?: string | null;
          created_at?: string;
          description: string;
          id?: string;
          location_label?: string | null;
          location_mode?: HunterLocationMode;
          opportunity_type: string;
          recruiter_profile_id: string;
          required_skills?: string[];
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: HunterOpportunityStatus;
          title: string;
          updated_at?: string;
        };
        Update: {
          admin_notes?: string | null;
          company_id?: string | null;
          compensation_label?: string | null;
          created_at?: string;
          description?: string;
          id?: string;
          location_label?: string | null;
          location_mode?: HunterLocationMode;
          opportunity_type?: string;
          recruiter_profile_id?: string;
          required_skills?: string[];
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: HunterOpportunityStatus;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "hunter_opportunities_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "hunter_companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "hunter_opportunities_recruiter_profile_id_fkey";
            columns: ["recruiter_profile_id"];
            isOneToOne: false;
            referencedRelation: "hunter_recruiter_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      hunter_invites: {
        Row: {
          candidate_visible_note: string | null;
          created_at: string;
          expires_at: string | null;
          id: string;
          message: string;
          opportunity_id: string | null;
          recruiter_private_note: string | null;
          recruiter_profile_id: string;
          status: HunterInviteStatus;
          talent_profile_id: string;
          updated_at: string;
        };
        Insert: {
          candidate_visible_note?: string | null;
          created_at?: string;
          expires_at?: string | null;
          id?: string;
          message: string;
          opportunity_id?: string | null;
          recruiter_private_note?: string | null;
          recruiter_profile_id: string;
          status?: HunterInviteStatus;
          talent_profile_id: string;
          updated_at?: string;
        };
        Update: {
          candidate_visible_note?: string | null;
          created_at?: string;
          expires_at?: string | null;
          id?: string;
          message?: string;
          opportunity_id?: string | null;
          recruiter_private_note?: string | null;
          recruiter_profile_id?: string;
          status?: HunterInviteStatus;
          talent_profile_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "hunter_invites_opportunity_id_fkey";
            columns: ["opportunity_id"];
            isOneToOne: false;
            referencedRelation: "hunter_opportunities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "hunter_invites_recruiter_profile_id_fkey";
            columns: ["recruiter_profile_id"];
            isOneToOne: false;
            referencedRelation: "hunter_recruiter_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "hunter_invites_talent_profile_id_fkey";
            columns: ["talent_profile_id"];
            isOneToOne: false;
            referencedRelation: "hunter_talent_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      verification_requests: {
        Row: {
          attempt_no: number;
          created_at: string;
          decided_at: string | null;
          id: string;
          id_front_path: string;
          reg_id_hash: string | null;
          reg_id_last4: string | null;
          reasons: Record<string, unknown>;
          score: number;
          status: VerificationStatus;
          university_id: string;
          user_id: string;
        };
        Insert: {
          attempt_no?: number;
          created_at?: string;
          decided_at?: string | null;
          id?: string;
          id_front_path: string;
          reg_id_hash?: string | null;
          reg_id_last4?: string | null;
          reasons?: Record<string, unknown>;
          score?: number;
          status?: VerificationStatus;
          university_id: string;
          user_id: string;
        };
        Update: {
          attempt_no?: number;
          created_at?: string;
          decided_at?: string | null;
          id?: string;
          id_front_path?: string;
          reg_id_hash?: string | null;
          reg_id_last4?: string | null;
          reasons?: Record<string, unknown>;
          score?: number;
          status?: VerificationStatus;
          university_id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      verification_codes: {
        Row: {
          attempt_count: number;
          code: string;
          created_at: string;
          email: string;
          expires_at: string;
          id: string;
          last_attempt_at: string | null;
          university_id: string;
          user_id: string;
        };
        Insert: {
          attempt_count?: number;
          code: string;
          created_at?: string;
          email: string;
          expires_at: string;
          id?: string;
          last_attempt_at?: string | null;
          university_id: string;
          user_id: string;
        };
        Update: {
          attempt_count?: number;
          code?: string;
          created_at?: string;
          email?: string;
          expires_at?: string;
          id?: string;
          last_attempt_at?: string | null;
          university_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "verification_codes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "verification_codes_university_id_fkey";
            columns: ["university_id"];
            isOneToOne: false;
            referencedRelation: "universities";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
