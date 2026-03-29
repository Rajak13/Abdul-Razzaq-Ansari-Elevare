--
-- PostgreSQL database dump
--

\restrict Bk1m3SXCwImePRjSedbPG20XAfdyYwpoUxjf7auijuPIWINl5DfvTfkHNiWrwg9

-- Dumped from database version 18.3 (Debian 18.3-1.pgdg12+1)
-- Dumped by pg_dump version 18.3 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: cleanup_expired_admin_sessions(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_expired_admin_sessions() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  DELETE FROM admin_sessions WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$;


--
-- Name: cleanup_expired_compliance_reports(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_expired_compliance_reports() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Delete expired compliance reports
  DELETE FROM compliance_reports 
  WHERE expires_at < CURRENT_TIMESTAMP;
  
  -- Revoke expired auditor access
  UPDATE external_auditor_access 
  SET revoked = true, revoked_at = CURRENT_TIMESTAMP
  WHERE expires_at < CURRENT_TIMESTAMP AND revoked = false;
  
  -- Log cleanup activity
  INSERT INTO audit_logs (admin_id, action_type, target_entity, details, ip_address, timestamp)
  VALUES (
    (SELECT id FROM admin_users WHERE role = 'owner' LIMIT 1),
    'compliance_cleanup',
    'compliance_reports',
    '{"automated_cleanup": true}',
    '127.0.0.1',
    CURRENT_TIMESTAMP
  );
END;
$$;


--
-- Name: cleanup_expired_gdpr_exports(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_expired_gdpr_exports() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Delete expired export requests
  DELETE FROM gdpr_export_requests 
  WHERE expires_at < CURRENT_TIMESTAMP AND status = 'completed';
  
  -- Log cleanup activity
  INSERT INTO audit_logs (admin_id, action_type, target_entity, details, ip_address, timestamp)
  VALUES (
    (SELECT id FROM admin_users WHERE role = 'owner' LIMIT 1),
    'gdpr_export_cleanup',
    'gdpr_export_requests',
    '{"automated_cleanup": true}',
    '127.0.0.1',
    CURRENT_TIMESTAMP
  );
END;
$$;


--
-- Name: expire_temporary_suspensions(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.expire_temporary_suspensions() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  UPDATE user_suspensions 
  SET is_active = FALSE,
      lifted_at = CURRENT_TIMESTAMP,
      lift_reason = 'Automatic expiration'
  WHERE is_active = TRUE 
  AND expires_at IS NOT NULL 
  AND expires_at <= CURRENT_TIMESTAMP;
END;
$$;


--
-- Name: generate_audit_hash(uuid, character varying, character varying, character varying, jsonb, inet, timestamp without time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_audit_hash(p_admin_id uuid, p_action_type character varying, p_target_entity character varying, p_target_id character varying, p_details jsonb, p_ip_address inet, p_timestamp timestamp without time zone) RETURNS character varying
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Generate SHA-256 hash of audit log data for integrity verification
  -- In production, this should use a more sophisticated HMAC with secret key
  RETURN encode(
    digest(
      CONCAT(
        COALESCE(p_admin_id::text, ''),
        COALESCE(p_action_type, ''),
        COALESCE(p_target_entity, ''),
        COALESCE(p_target_id, ''),
        COALESCE(p_details::text, ''),
        COALESCE(p_ip_address::text, ''),
        COALESCE(p_timestamp::text, '')
      ),
      'sha256'
    ),
    'hex'
  );
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: user_suspensions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_suspensions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    suspended_by uuid NOT NULL,
    reason character varying(255) NOT NULL,
    suspension_type character varying(20) NOT NULL,
    starts_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp without time zone,
    is_active boolean DEFAULT true,
    lifted_by uuid,
    lifted_at timestamp without time zone,
    lift_reason text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_suspensions_suspension_type_check CHECK (((suspension_type)::text = ANY ((ARRAY['temporary'::character varying, 'permanent'::character varying])::text[])))
);


--
-- Name: TABLE user_suspensions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_suspensions IS 'User account suspension management';


--
-- Name: get_active_suspension(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_active_suspension(p_user_id uuid) RETURNS public.user_suspensions
    LANGUAGE plpgsql
    AS $$
DECLARE
  suspension user_suspensions;
BEGIN
  SELECT * INTO suspension
  FROM user_suspensions 
  WHERE user_id = p_user_id 
  AND is_active = TRUE 
  AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
  ORDER BY created_at DESC
  LIMIT 1;
  
  RETURN suspension;
END;
$$;


--
-- Name: is_user_suspended(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_user_suspended(p_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_suspensions 
    WHERE user_id = p_user_id 
    AND is_active = TRUE 
    AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
  );
END;
$$;


--
-- Name: set_audit_log_hash(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_audit_log_hash() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.hash = generate_audit_hash(
    NEW.admin_id,
    NEW.action_type,
    NEW.target_entity,
    NEW.target_id,
    NEW.details,
    NEW.ip_address,
    NEW.timestamp
  );
  RETURN NEW;
END;
$$;


--
-- Name: update_dashboard_preferences_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_dashboard_preferences_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: update_suspension_appeals_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_suspension_appeals_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


--
-- Name: abuse_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.abuse_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reporter_id uuid NOT NULL,
    reported_user_id uuid NOT NULL,
    content_type character varying(50) NOT NULL,
    content_id uuid NOT NULL,
    reason character varying(100) NOT NULL,
    description text,
    status character varying(20) DEFAULT 'pending'::character varying,
    priority character varying(10) DEFAULT 'medium'::character varying,
    moderator_id uuid,
    action_taken character varying(100),
    moderator_notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    resolved_at timestamp without time zone,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT abuse_reports_content_type_check CHECK (((content_type)::text = ANY ((ARRAY['note'::character varying, 'message'::character varying, 'file'::character varying, 'resource'::character varying, 'whiteboard'::character varying, 'profile'::character varying, 'study_group'::character varying, 'comment'::character varying])::text[]))),
    CONSTRAINT abuse_reports_priority_check CHECK (((priority)::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'urgent'::character varying])::text[]))),
    CONSTRAINT abuse_reports_reason_check CHECK (((reason)::text = ANY ((ARRAY['spam'::character varying, 'harassment'::character varying, 'inappropriate_content'::character varying, 'copyright_violation'::character varying, 'hate_speech'::character varying, 'violence'::character varying, 'other'::character varying])::text[]))),
    CONSTRAINT abuse_reports_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'under_review'::character varying, 'resolved'::character varying, 'dismissed'::character varying])::text[])))
);


--
-- Name: TABLE abuse_reports; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.abuse_reports IS 'User-generated abuse reports with metadata only';


--
-- Name: COLUMN abuse_reports.content_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.abuse_reports.content_id IS 'ID of reported content - content itself is never stored';


--
-- Name: CONSTRAINT abuse_reports_content_type_check ON abuse_reports; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON CONSTRAINT abuse_reports_content_type_check ON public.abuse_reports IS 'Allowed content types for abuse reports including comments';


--
-- Name: admin_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_id uuid,
    type character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    data jsonb,
    read boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT admin_notifications_type_check CHECK (((type)::text = ANY ((ARRAY['new_report'::character varying, 'user_suspended'::character varying, 'content_deleted'::character varying, 'system_alert'::character varying])::text[])))
);


--
-- Name: TABLE admin_notifications; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.admin_notifications IS 'Real-time notifications for admin users';


--
-- Name: COLUMN admin_notifications.admin_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admin_notifications.admin_id IS 'Target admin user ID, NULL for broadcast to all admins';


--
-- Name: COLUMN admin_notifications.type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admin_notifications.type IS 'Notification type: new_report, user_suspended, content_deleted, system_alert';


--
-- Name: COLUMN admin_notifications.data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admin_notifications.data IS 'Type-specific notification data in JSON format';


--
-- Name: admin_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_id uuid NOT NULL,
    token_hash character varying(255) NOT NULL,
    ip_address inet NOT NULL,
    user_agent text,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_admin boolean DEFAULT false,
    last_activity timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE admin_sessions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.admin_sessions IS 'Active admin sessions with security tracking';


--
-- Name: COLUMN admin_sessions.token_hash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admin_sessions.token_hash IS 'Hashed JWT token for security';


--
-- Name: COLUMN admin_sessions.is_admin; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admin_sessions.is_admin IS 'Whether this is an admin user session';


--
-- Name: COLUMN admin_sessions.last_activity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admin_sessions.last_activity IS 'Timestamp of the last activity in this session';


--
-- Name: admin_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role character varying(50) NOT NULL,
    mfa_secret character varying(255),
    mfa_enabled boolean DEFAULT false,
    backup_codes text[],
    last_login timestamp without time zone,
    failed_login_attempts integer DEFAULT 0,
    account_locked boolean DEFAULT false,
    locked_until timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT admin_users_role_check CHECK (((role)::text = ANY ((ARRAY['owner'::character varying, 'administrator'::character varying, 'moderator'::character varying])::text[])))
);


--
-- Name: TABLE admin_users; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.admin_users IS 'Administrative users with role-based access control';


--
-- Name: COLUMN admin_users.mfa_secret; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admin_users.mfa_secret IS 'TOTP secret for multi-factor authentication';


--
-- Name: COLUMN admin_users.backup_codes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admin_users.backup_codes IS 'Encrypted backup codes for MFA recovery';


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_id uuid NOT NULL,
    action_type character varying(100) NOT NULL,
    target_entity character varying(100),
    target_id character varying(255),
    details jsonb,
    ip_address inet NOT NULL,
    user_agent text,
    "timestamp" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    hash character varying(255) NOT NULL
);


--
-- Name: TABLE audit_logs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.audit_logs IS 'Immutable audit trail with cryptographic integrity';


--
-- Name: COLUMN audit_logs.hash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.audit_logs.hash IS 'Cryptographic hash for tamper detection';


--
-- Name: backup_restorations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.backup_restorations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    backup_id character varying(255) NOT NULL,
    backup_timestamp timestamp without time zone NOT NULL,
    restoration_type character varying(50) NOT NULL,
    status character varying(50) NOT NULL,
    initiated_by uuid NOT NULL,
    initiated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    completed_at timestamp without time zone,
    error_message text,
    integrity_verified boolean DEFAULT false,
    CONSTRAINT backup_restorations_restoration_type_check CHECK (((restoration_type)::text = ANY ((ARRAY['full'::character varying, 'partial'::character varying, 'database'::character varying, 'files'::character varying])::text[]))),
    CONSTRAINT backup_restorations_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'in_progress'::character varying, 'completed'::character varying, 'failed'::character varying])::text[])))
);


--
-- Name: TABLE backup_restorations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.backup_restorations IS 'Backup restoration operations with integrity verification';


--
-- Name: COLUMN backup_restorations.restoration_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.backup_restorations.restoration_type IS 'Type of restoration: full, partial, database, or files';


--
-- Name: COLUMN backup_restorations.integrity_verified; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.backup_restorations.integrity_verified IS 'Whether backup integrity has been verified before restoration';


--
-- Name: compliance_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.compliance_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    report_type character varying(50) NOT NULL,
    start_date timestamp without time zone NOT NULL,
    end_date timestamp without time zone NOT NULL,
    generated_by uuid NOT NULL,
    generated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    data_minimized boolean DEFAULT true,
    encryption_used boolean DEFAULT false,
    report_data jsonb NOT NULL,
    download_url text,
    expires_at timestamp without time zone,
    encryption_key text
);


--
-- Name: TABLE compliance_reports; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.compliance_reports IS 'Generated compliance reports with data minimization and encryption';


--
-- Name: COLUMN compliance_reports.data_minimized; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.compliance_reports.data_minimized IS 'Whether personal data was minimized in the report';


--
-- Name: COLUMN compliance_reports.encryption_used; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.compliance_reports.encryption_used IS 'Whether the report data is encrypted';


--
-- Name: COLUMN compliance_reports.encryption_key; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.compliance_reports.encryption_key IS 'Encrypted key for report data decryption';


--
-- Name: dashboard_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dashboard_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    widget_layout jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: data_retention_policies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.data_retention_policies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_type character varying(50) NOT NULL,
    retention_days integer NOT NULL,
    auto_delete boolean DEFAULT false,
    legal_basis character varying(100) NOT NULL,
    description text,
    created_by uuid NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT data_retention_policies_retention_days_check CHECK ((retention_days > 0))
);


--
-- Name: TABLE data_retention_policies; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.data_retention_policies IS 'Data retention policies for GDPR compliance';


--
-- Name: COLUMN data_retention_policies.auto_delete; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.data_retention_policies.auto_delete IS 'Whether data should be automatically deleted after retention period';


--
-- Name: emergency_lockdowns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.emergency_lockdowns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    enabled boolean DEFAULT true,
    reason text NOT NULL,
    duration_hours integer,
    enabled_by uuid NOT NULL,
    enabled_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp without time zone,
    disabled_at timestamp without time zone,
    disabled_by uuid
);


--
-- Name: TABLE emergency_lockdowns; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.emergency_lockdowns IS 'Emergency system lockdowns with user access restriction';


--
-- Name: COLUMN emergency_lockdowns.enabled; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.emergency_lockdowns.enabled IS 'Whether lockdown is currently active';


--
-- Name: COLUMN emergency_lockdowns.duration_hours; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.emergency_lockdowns.duration_hours IS 'Lockdown duration in hours (NULL = indefinite)';


--
-- Name: COLUMN emergency_lockdowns.expires_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.emergency_lockdowns.expires_at IS 'When lockdown automatically expires (NULL = manual disable required)';


--
-- Name: external_auditor_access; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.external_auditor_access (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    auditor_email character varying(255) NOT NULL,
    access_level character varying(20) NOT NULL,
    granted_by uuid NOT NULL,
    granted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp without time zone NOT NULL,
    access_token_hash character varying(255) NOT NULL,
    revoked boolean DEFAULT false,
    revoked_at timestamp without time zone,
    last_accessed timestamp without time zone,
    CONSTRAINT external_auditor_access_access_level_check CHECK (((access_level)::text = ANY ((ARRAY['read_only'::character varying, 'audit_logs'::character varying, 'compliance_reports'::character varying])::text[])))
);


--
-- Name: TABLE external_auditor_access; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.external_auditor_access IS 'Temporary access credentials for external auditors';


--
-- Name: COLUMN external_auditor_access.access_token_hash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.external_auditor_access.access_token_hash IS 'Hashed access token for security';


--
-- Name: COLUMN external_auditor_access.last_accessed; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.external_auditor_access.last_accessed IS 'Last time the auditor accessed the system';


--
-- Name: feature_flags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feature_flags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    enabled boolean DEFAULT false,
    rollout_percentage integer DEFAULT 0,
    config jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT feature_flags_rollout_percentage_check CHECK (((rollout_percentage >= 0) AND (rollout_percentage <= 100)))
);


--
-- Name: TABLE feature_flags; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.feature_flags IS 'System feature toggles for gradual rollouts';


--
-- Name: COLUMN feature_flags.rollout_percentage; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.feature_flags.rollout_percentage IS 'Percentage of users who see this feature';


--
-- Name: file_access_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.file_access_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    file_id uuid NOT NULL,
    user_id uuid NOT NULL,
    action character varying(50) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: file_folders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.file_folders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    parent_id uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: file_shares; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.file_shares (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    file_id uuid NOT NULL,
    shared_with_user_id uuid NOT NULL,
    shared_by_user_id uuid NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: files; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.files (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    path character varying(500) NOT NULL,
    size bigint NOT NULL,
    mime_type character varying(100) NOT NULL,
    folder_id uuid,
    is_shared boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    tags text[] DEFAULT '{}'::text[]
);


--
-- Name: gdpr_deletion_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gdpr_deletion_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    requested_by_admin uuid NOT NULL,
    identity_verified boolean DEFAULT false,
    verification_method character varying(50) NOT NULL,
    deletion_reason text NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    requested_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    verified_at timestamp without time zone,
    completed_at timestamp without time zone,
    deletion_report jsonb,
    CONSTRAINT gdpr_deletion_requests_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'verified'::character varying, 'processing'::character varying, 'completed'::character varying, 'failed'::character varying])::text[]))),
    CONSTRAINT gdpr_deletion_requests_verification_method_check CHECK (((verification_method)::text = ANY ((ARRAY['email_verification'::character varying, 'admin_verification'::character varying, 'document_verification'::character varying])::text[])))
);


--
-- Name: TABLE gdpr_deletion_requests; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.gdpr_deletion_requests IS 'GDPR Article 17 - Right to erasure (right to be forgotten) requests';


--
-- Name: COLUMN gdpr_deletion_requests.identity_verified; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.gdpr_deletion_requests.identity_verified IS 'Whether the user identity has been verified for the deletion request';


--
-- Name: COLUMN gdpr_deletion_requests.verification_method; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.gdpr_deletion_requests.verification_method IS 'Method used to verify user identity';


--
-- Name: COLUMN gdpr_deletion_requests.deletion_report; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.gdpr_deletion_requests.deletion_report IS 'JSON report of what data was deleted';


--
-- Name: gdpr_export_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gdpr_export_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    requested_by_admin uuid NOT NULL,
    export_format character varying(10) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    requested_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    completed_at timestamp without time zone,
    download_url text,
    expires_at timestamp without time zone,
    CONSTRAINT gdpr_export_requests_export_format_check CHECK (((export_format)::text = ANY ((ARRAY['json'::character varying, 'xml'::character varying, 'csv'::character varying])::text[]))),
    CONSTRAINT gdpr_export_requests_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'completed'::character varying, 'failed'::character varying])::text[])))
);


--
-- Name: TABLE gdpr_export_requests; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.gdpr_export_requests IS 'GDPR Article 20 - Right to data portability requests';


--
-- Name: COLUMN gdpr_export_requests.download_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.gdpr_export_requests.download_url IS 'Secure URL for downloading the exported data';


--
-- Name: COLUMN gdpr_export_requests.expires_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.gdpr_export_requests.expires_at IS 'When the download link expires for security';


--
-- Name: group_join_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.group_join_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    group_id uuid NOT NULL,
    user_id uuid NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT group_join_requests_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying])::text[])))
);


--
-- Name: group_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.group_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    group_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role character varying(20) DEFAULT 'member'::character varying NOT NULL,
    joined_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT group_members_role_check CHECK (((role)::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying, 'member'::character varying])::text[])))
);


--
-- Name: group_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.group_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    group_id uuid NOT NULL,
    user_id uuid NOT NULL,
    content text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: group_resources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.group_resources (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    group_id uuid NOT NULL,
    resource_id uuid NOT NULL,
    shared_by uuid NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: incident_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.incident_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    incident_type character varying(50) NOT NULL,
    severity character varying(20) NOT NULL,
    description text NOT NULL,
    affected_users_count integer,
    affected_data_types text[],
    breach_scope text,
    status character varying(50) NOT NULL,
    reported_by uuid NOT NULL,
    reported_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    resolved_at timestamp without time zone,
    resolution_notes text,
    CONSTRAINT incident_reports_incident_type_check CHECK (((incident_type)::text = ANY ((ARRAY['data_breach'::character varying, 'security_incident'::character varying, 'system_failure'::character varying, 'unauthorized_access'::character varying])::text[]))),
    CONSTRAINT incident_reports_severity_check CHECK (((severity)::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'critical'::character varying])::text[]))),
    CONSTRAINT incident_reports_status_check CHECK (((status)::text = ANY ((ARRAY['reported'::character varying, 'investigating'::character varying, 'contained'::character varying, 'resolved'::character varying])::text[])))
);


--
-- Name: TABLE incident_reports; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.incident_reports IS 'Security and data breach incident tracking';


--
-- Name: COLUMN incident_reports.affected_users_count; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.incident_reports.affected_users_count IS 'Number of users affected by incident (metadata only)';


--
-- Name: COLUMN incident_reports.affected_data_types; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.incident_reports.affected_data_types IS 'Types of data affected (no actual content)';


--
-- Name: COLUMN incident_reports.breach_scope; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.incident_reports.breach_scope IS 'Scope of breach without exposing private content';


--
-- Name: moderation_actions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.moderation_actions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    moderator_id uuid NOT NULL,
    action_type character varying(50) NOT NULL,
    target_user_id uuid,
    target_content_type character varying(50),
    target_content_id uuid,
    abuse_report_id uuid,
    details jsonb,
    ip_address inet NOT NULL,
    user_agent text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE moderation_actions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.moderation_actions IS 'Audit trail of all moderation activities';


--
-- Name: COLUMN moderation_actions.details; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.moderation_actions.details IS 'Action details without exposing private content';


--
-- Name: note_folders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.note_folders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    parent_id uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    color character varying(7) DEFAULT '#6b7280'::character varying
);


--
-- Name: notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    content text NOT NULL,
    folder_id uuid,
    tags text[] DEFAULT '{}'::text[],
    is_collaborative boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    summary text,
    summary_generated_at timestamp without time zone,
    summary_model character varying(50),
    content_hash character varying(64)
);


--
-- Name: COLUMN notes.summary; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.notes.summary IS 'AI-generated summary of the note content';


--
-- Name: COLUMN notes.summary_generated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.notes.summary_generated_at IS 'Timestamp when the summary was generated';


--
-- Name: COLUMN notes.summary_model; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.notes.summary_model IS 'AI model used to generate the summary (e.g., PEGASUS)';


--
-- Name: COLUMN notes.content_hash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.notes.content_hash IS 'SHA-256 hash of note content when summary was generated, used for change detection';


--
-- Name: notification_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    notification_type character varying(50) NOT NULL,
    enabled boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    content text NOT NULL,
    link character varying(500),
    is_read boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_reset_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token character varying(255) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: privacy_impact_assessments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.privacy_impact_assessments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    assessment_type character varying(100) NOT NULL,
    data_categories jsonb NOT NULL,
    processing_purposes jsonb NOT NULL,
    legal_basis jsonb NOT NULL,
    risk_level character varying(10) NOT NULL,
    mitigation_measures jsonb NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT privacy_impact_assessments_risk_level_check CHECK (((risk_level)::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying])::text[])))
);


--
-- Name: TABLE privacy_impact_assessments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.privacy_impact_assessments IS 'GDPR Article 35 - Data protection impact assessments';


--
-- Name: COLUMN privacy_impact_assessments.risk_level; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.privacy_impact_assessments.risk_level IS 'Assessed privacy risk level';


--
-- Name: resource_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resource_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    resource_id uuid NOT NULL,
    user_id uuid NOT NULL,
    content text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: resource_ratings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resource_ratings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    resource_id uuid NOT NULL,
    user_id uuid NOT NULL,
    rating integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT resource_ratings_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: resources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resources (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    file_url character varying(500) NOT NULL,
    file_type character varying(100) NOT NULL,
    file_size bigint NOT NULL,
    tags text[] DEFAULT '{}'::text[],
    download_count integer DEFAULT 0,
    average_rating numeric(3,2),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    file_name character varying(255) NOT NULL
);


--
-- Name: security_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.security_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_type character varying(100) NOT NULL,
    severity character varying(20) NOT NULL,
    source_ip inet,
    user_agent text,
    admin_id uuid,
    details jsonb,
    resolved boolean DEFAULT false,
    resolved_by uuid,
    resolved_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT security_events_severity_check CHECK (((severity)::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'critical'::character varying])::text[])))
);


--
-- Name: TABLE security_events; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.security_events IS 'Security monitoring and incident tracking';


--
-- Name: security_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.security_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type character varying(50) NOT NULL,
    severity character varying(20) NOT NULL,
    user_id uuid,
    ip_address inet NOT NULL,
    user_agent text,
    details jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT security_logs_severity_check CHECK (((severity)::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'critical'::character varying])::text[]))),
    CONSTRAINT security_logs_type_check CHECK (((type)::text = ANY ((ARRAY['failed_login'::character varying, 'suspicious_activity'::character varying, 'blocked_ip'::character varying, 'threat_detected'::character varying, 'session_terminated'::character varying, 'unauthorized_access'::character varying])::text[])))
);


--
-- Name: TABLE security_logs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.security_logs IS 'Security event logs for monitoring and threat detection';


--
-- Name: COLUMN security_logs.type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.security_logs.type IS 'Type of security event';


--
-- Name: COLUMN security_logs.severity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.security_logs.severity IS 'Severity level: low, medium, high, critical';


--
-- Name: COLUMN security_logs.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.security_logs.user_id IS 'Associated user ID if applicable';


--
-- Name: COLUMN security_logs.ip_address; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.security_logs.ip_address IS 'Source IP address of the security event';


--
-- Name: COLUMN security_logs.details; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.security_logs.details IS 'Additional event details in JSON format';


--
-- Name: study_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.study_groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    owner_id uuid NOT NULL,
    is_private boolean DEFAULT false,
    max_members integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    tags text[] DEFAULT '{}'::text[]
);


--
-- Name: suspension_appeals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.suspension_appeals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    suspension_id uuid NOT NULL,
    appeal_message text NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying,
    admin_response text,
    reviewed_by uuid,
    reviewed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT suspension_appeals_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying, 'under_review'::character varying])::text[])))
);


--
-- Name: TABLE suspension_appeals; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.suspension_appeals IS 'User appeals against account suspensions';


--
-- Name: COLUMN suspension_appeals.appeal_message; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.suspension_appeals.appeal_message IS 'User message explaining why suspension should be lifted';


--
-- Name: COLUMN suspension_appeals.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.suspension_appeals.status IS 'Appeal status: pending, approved, rejected, under_review';


--
-- Name: COLUMN suspension_appeals.admin_response; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.suspension_appeals.admin_response IS 'Admin response to the appeal';


--
-- Name: system_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key character varying(100) NOT NULL,
    value jsonb NOT NULL,
    description text,
    category character varying(50),
    updated_by uuid NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE system_config; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.system_config IS 'Platform configuration parameters';


--
-- Name: COLUMN system_config.category; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_config.category IS 'Configuration category: maintenance, limits, notifications, security, etc.';


--
-- Name: task_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    color character varying(7),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    due_date timestamp without time zone,
    priority character varying(20) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    category_id uuid,
    completed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    tags text[],
    sort_order integer DEFAULT 0,
    CONSTRAINT tasks_priority_check CHECK (((priority)::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'urgent'::character varying])::text[]))),
    CONSTRAINT tasks_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'completed'::character varying])::text[])))
);


--
-- Name: user_violations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_violations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    violation_type character varying(100) NOT NULL,
    severity character varying(20) NOT NULL,
    description text,
    moderator_id uuid NOT NULL,
    abuse_report_id uuid,
    action_taken character varying(100) NOT NULL,
    duration_hours integer,
    expires_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_violations_severity_check CHECK (((severity)::text = ANY ((ARRAY['warning'::character varying, 'minor'::character varying, 'major'::character varying, 'severe'::character varying])::text[])))
);


--
-- Name: TABLE user_violations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_violations IS 'User violation history tracking without private content';


--
-- Name: COLUMN user_violations.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_violations.description IS 'Violation description without private content';


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255),
    name character varying(255) NOT NULL,
    bio text,
    avatar_url character varying(500),
    email_verified boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    preferred_language character varying(5) DEFAULT 'en'::character varying,
    account_type character varying(50) DEFAULT 'student'::character varying,
    last_login timestamp without time zone,
    account_status character varying(50) DEFAULT 'active'::character varying,
    timezone character varying(100) DEFAULT 'UTC'::character varying,
    phone character varying(20),
    date_of_birth date,
    institution character varying(255),
    gender character varying(30),
    age integer,
    otp_code character varying(6),
    otp_expires_at timestamp without time zone,
    otp_attempts integer DEFAULT 0,
    university character varying(255),
    major character varying(255),
    graduation_date date,
    oauth_provider character varying(50),
    oauth_id character varying(255),
    oauth_profile jsonb,
    walkthrough_completed boolean DEFAULT false,
    CONSTRAINT users_account_status_check CHECK (((account_status)::text = ANY ((ARRAY['active'::character varying, 'suspended'::character varying, 'deleted'::character varying, 'pending'::character varying])::text[]))),
    CONSTRAINT users_account_type_check CHECK (((account_type)::text = ANY ((ARRAY['student'::character varying, 'educator'::character varying, 'professional'::character varying, 'researcher'::character varying, 'other'::character varying])::text[]))),
    CONSTRAINT users_age_check CHECK (((age >= 13) AND (age <= 120))),
    CONSTRAINT users_gender_check CHECK (((gender)::text = ANY ((ARRAY['male'::character varying, 'female'::character varying, 'other'::character varying, 'prefer_not_to_say'::character varying])::text[])))
);


--
-- Name: COLUMN users.preferred_language; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.preferred_language IS 'User preferred language code (en, ne, ko)';


--
-- Name: COLUMN users.account_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.account_type IS 'Type of user account: student, educator, professional, researcher, other';


--
-- Name: COLUMN users.last_login; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.last_login IS 'Timestamp of the user''s last successful login';


--
-- Name: COLUMN users.account_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.account_status IS 'Current status of the user account';


--
-- Name: COLUMN users.timezone; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.timezone IS 'User''s preferred timezone';


--
-- Name: COLUMN users.institution; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.institution IS 'Educational institution or organization name';


--
-- Name: COLUMN users.gender; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.gender IS 'User gender: male, female, other, prefer_not_to_say (optional)';


--
-- Name: COLUMN users.age; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.age IS 'User age calculated from date_of_birth. Automatically updated on profile save.';


--
-- Name: COLUMN users.oauth_provider; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.oauth_provider IS 'OAuth provider name (google, facebook, or null for regular users)';


--
-- Name: COLUMN users.oauth_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.oauth_id IS 'Unique identifier from OAuth provider';


--
-- Name: COLUMN users.oauth_profile; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.oauth_profile IS 'Raw OAuth profile data stored as JSON';


--
-- Name: COLUMN users.walkthrough_completed; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.walkthrough_completed IS 'Indicates whether the user has completed the first-time product walkthrough';


--
-- Name: whiteboard_elements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whiteboard_elements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    whiteboard_id uuid NOT NULL,
    element_type character varying(50) NOT NULL,
    element_data jsonb NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: whiteboard_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whiteboard_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    whiteboard_id uuid NOT NULL,
    canvas_data jsonb NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: whiteboards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whiteboards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    group_id uuid,
    user_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    canvas_data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Data for Name: abuse_reports; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.abuse_reports (id, reporter_id, reported_user_id, content_type, content_id, reason, description, status, priority, moderator_id, action_taken, moderator_notes, created_at, resolved_at, updated_at) FROM stdin;
\.


--
-- Data for Name: admin_notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.admin_notifications (id, admin_id, type, title, message, data, read, created_at) FROM stdin;
\.


--
-- Data for Name: admin_sessions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.admin_sessions (id, admin_id, token_hash, ip_address, user_agent, expires_at, created_at, is_admin, last_activity) FROM stdin;
\.


--
-- Data for Name: admin_users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.admin_users (id, email, password_hash, role, mfa_secret, mfa_enabled, backup_codes, last_login, failed_login_attempts, account_locked, locked_until, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.audit_logs (id, admin_id, action_type, target_entity, target_id, details, ip_address, user_agent, "timestamp", hash) FROM stdin;
\.


--
-- Data for Name: backup_restorations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.backup_restorations (id, backup_id, backup_timestamp, restoration_type, status, initiated_by, initiated_at, completed_at, error_message, integrity_verified) FROM stdin;
\.


--
-- Data for Name: compliance_reports; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.compliance_reports (id, report_type, start_date, end_date, generated_by, generated_at, data_minimized, encryption_used, report_data, download_url, expires_at, encryption_key) FROM stdin;
\.


--
-- Data for Name: dashboard_preferences; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.dashboard_preferences (id, user_id, widget_layout, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: data_retention_policies; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.data_retention_policies (id, entity_type, retention_days, auto_delete, legal_basis, description, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: emergency_lockdowns; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.emergency_lockdowns (id, enabled, reason, duration_hours, enabled_by, enabled_at, expires_at, disabled_at, disabled_by) FROM stdin;
\.


--
-- Data for Name: external_auditor_access; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.external_auditor_access (id, auditor_email, access_level, granted_by, granted_at, expires_at, access_token_hash, revoked, revoked_at, last_accessed) FROM stdin;
\.


--
-- Data for Name: feature_flags; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.feature_flags (id, name, description, enabled, rollout_percentage, config, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: file_access_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.file_access_logs (id, file_id, user_id, action, created_at) FROM stdin;
f1b5b409-7e2b-4a76-9192-f726e384c33d	c74ed069-b011-49cf-9392-f1fa3ad8d04b	a3a3670c-0e72-4a7a-b21c-259ea751ec59	upload	2026-03-27 15:09:21.814523
534fc5db-8367-4489-b49d-c81c4fdd0471	c74ed069-b011-49cf-9392-f1fa3ad8d04b	a3a3670c-0e72-4a7a-b21c-259ea751ec59	download	2026-03-27 15:09:43.140125
f282a6b9-a48c-49fa-8311-8cd928570619	c74ed069-b011-49cf-9392-f1fa3ad8d04b	a3a3670c-0e72-4a7a-b21c-259ea751ec59	update	2026-03-27 15:09:45.405737
c01edfbf-daf4-4643-8b73-14d9988c1b3e	c74ed069-b011-49cf-9392-f1fa3ad8d04b	a3a3670c-0e72-4a7a-b21c-259ea751ec59	download	2026-03-27 15:12:50.840937
13ff9b58-1af2-4e08-9b19-12e77b75744f	c74ed069-b011-49cf-9392-f1fa3ad8d04b	a3a3670c-0e72-4a7a-b21c-259ea751ec59	download	2026-03-27 15:12:58.797937
4da214b1-8363-478d-a13b-f5977aec11a8	c74ed069-b011-49cf-9392-f1fa3ad8d04b	a3a3670c-0e72-4a7a-b21c-259ea751ec59	download	2026-03-27 15:12:58.798027
\.


--
-- Data for Name: file_folders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.file_folders (id, user_id, name, parent_id, created_at, updated_at) FROM stdin;
0bbc5ef7-e839-4402-b447-6b45bda91fe4	a3a3670c-0e72-4a7a-b21c-259ea751ec59	Selfies	\N	2026-03-27 15:09:36.651092	2026-03-27 15:09:36.651092
\.


--
-- Data for Name: file_shares; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.file_shares (id, file_id, shared_with_user_id, shared_by_user_id, created_at) FROM stdin;
\.


--
-- Data for Name: files; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.files (id, user_id, name, path, size, mime_type, folder_id, is_shared, created_at, updated_at, tags) FROM stdin;
c74ed069-b011-49cf-9392-f1fa3ad8d04b	a3a3670c-0e72-4a7a-b21c-259ea751ec59	Selfie	/uploads/files/eddb9e53-bf22-4ee2-997e-ebae19b632ec.jpg	1867394	image/jpeg	0bbc5ef7-e839-4402-b447-6b45bda91fe4	f	2026-03-27 15:09:21.814523	2026-03-27 15:09:45.405737	{}
\.


--
-- Data for Name: gdpr_deletion_requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.gdpr_deletion_requests (id, user_id, requested_by_admin, identity_verified, verification_method, deletion_reason, status, requested_at, verified_at, completed_at, deletion_report) FROM stdin;
\.


--
-- Data for Name: gdpr_export_requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.gdpr_export_requests (id, user_id, requested_by_admin, export_format, status, requested_at, completed_at, download_url, expires_at) FROM stdin;
\.


--
-- Data for Name: group_join_requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.group_join_requests (id, group_id, user_id, status, created_at, updated_at) FROM stdin;
0600cb7b-6a18-4964-b3cb-84a505ba5801	d26bbaa0-5038-41ed-9437-87a7b66ea312	b63f19d3-6b6a-4959-ac1c-a9cb793feb7c	approved	2026-03-07 14:21:23.004833	2026-03-07 14:21:54.21249
f960dc54-fcee-401f-8533-b5c771804a8f	d26bbaa0-5038-41ed-9437-87a7b66ea312	85e03b40-d245-4589-b936-a7378796ad34	approved	2026-03-26 11:41:15.141957	2026-03-26 11:41:56.103694
1e575f5c-89c0-4e51-be48-318abf6ae1fe	d26bbaa0-5038-41ed-9437-87a7b66ea312	f810b345-d156-4d69-9cb9-486492218e7d	approved	2026-03-26 11:44:10.017971	2026-03-26 11:44:20.173196
297a39b0-1455-4527-9a72-5a4f77a045db	d26bbaa0-5038-41ed-9437-87a7b66ea312	a728c824-0f73-4fa3-8296-78dfd82d325f	approved	2026-03-26 11:44:46.583282	2026-03-26 11:44:57.041937
f7890655-8532-403e-9cac-0bacee0605a4	d26bbaa0-5038-41ed-9437-87a7b66ea312	67b9ed97-23a9-4c1b-9e9f-9e88cc3c017f	approved	2026-03-26 13:10:55.653793	2026-03-26 13:11:01.386776
8840ffbb-e3d7-488d-a017-4bd1cbbe85e1	d26bbaa0-5038-41ed-9437-87a7b66ea312	f794fc40-a7bd-4c57-8159-4e6704d79586	approved	2026-03-27 08:46:46.613942	2026-03-27 08:47:43.536373
\.


--
-- Data for Name: group_members; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.group_members (id, group_id, user_id, role, joined_at) FROM stdin;
c7e80c67-f217-42d2-907a-38dfdd7f0dd5	d26bbaa0-5038-41ed-9437-87a7b66ea312	a3a3670c-0e72-4a7a-b21c-259ea751ec59	owner	2026-03-07 14:15:05.764621
22ac52fc-b8d2-4223-b9f7-c40de00d7531	d26bbaa0-5038-41ed-9437-87a7b66ea312	b63f19d3-6b6a-4959-ac1c-a9cb793feb7c	member	2026-03-07 14:21:54.215407
9e3124d2-ee99-4eeb-8a6e-0a0df1a7acdc	d26bbaa0-5038-41ed-9437-87a7b66ea312	85e03b40-d245-4589-b936-a7378796ad34	member	2026-03-26 11:41:56.105474
ee9a0af4-6086-4e47-a183-7493350aad00	d26bbaa0-5038-41ed-9437-87a7b66ea312	f810b345-d156-4d69-9cb9-486492218e7d	member	2026-03-26 11:44:20.181581
ed392e0c-a7a9-4e21-8f1f-a578a0b63664	d26bbaa0-5038-41ed-9437-87a7b66ea312	a728c824-0f73-4fa3-8296-78dfd82d325f	member	2026-03-26 11:44:57.050954
96627cf0-dd39-4e88-b98a-49a55ebc7e85	d26bbaa0-5038-41ed-9437-87a7b66ea312	67b9ed97-23a9-4c1b-9e9f-9e88cc3c017f	member	2026-03-26 13:11:01.389556
a81dc2a0-3fe4-46bb-9f32-bcb415ea0407	d26bbaa0-5038-41ed-9437-87a7b66ea312	f794fc40-a7bd-4c57-8159-4e6704d79586	member	2026-03-27 08:47:43.541099
\.


--
-- Data for Name: group_messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.group_messages (id, group_id, user_id, content, created_at) FROM stdin;
9364a434-a6cb-410f-a4c5-8d8d38f08476	d26bbaa0-5038-41ed-9437-87a7b66ea312	b63f19d3-6b6a-4959-ac1c-a9cb793feb7c	hi	2026-03-07 14:22:25.20339
2a360c50-fe89-493e-bd9e-4796f1a6bac4	d26bbaa0-5038-41ed-9437-87a7b66ea312	a3a3670c-0e72-4a7a-b21c-259ea751ec59	Hello	2026-03-07 14:22:33.318403
8dc1eaa9-e446-4b3a-8d4e-e9e8dff34889	d26bbaa0-5038-41ed-9437-87a7b66ea312	b63f19d3-6b6a-4959-ac1c-a9cb793feb7c	Can we talk through video chat?	2026-03-07 14:52:20.966084
92cb192d-54e8-4452-8454-5cba38e023c0	d26bbaa0-5038-41ed-9437-87a7b66ea312	a3a3670c-0e72-4a7a-b21c-259ea751ec59	Ok	2026-03-08 02:06:59.067223
cad8025f-f7ca-47c6-b45f-fe1958bd1216	d26bbaa0-5038-41ed-9437-87a7b66ea312	a3a3670c-0e72-4a7a-b21c-259ea751ec59	Hi	2026-03-26 02:43:31.976015
71338b2a-38b9-49d3-b457-2a7a7b623781	d26bbaa0-5038-41ed-9437-87a7b66ea312	b63f19d3-6b6a-4959-ac1c-a9cb793feb7c	yo bro	2026-03-26 02:43:39.203594
609bd1a4-3cab-40a8-9918-02d45f89f208	d26bbaa0-5038-41ed-9437-87a7b66ea312	b63f19d3-6b6a-4959-ac1c-a9cb793feb7c	yo bro how you doing	2026-03-26 02:44:03.627696
5a85e890-ad1e-4789-a42f-b6b468d1653a	d26bbaa0-5038-41ed-9437-87a7b66ea312	a3a3670c-0e72-4a7a-b21c-259ea751ec59	Fine	2026-03-26 12:20:06.707303
01605b41-53c1-4655-a2a0-851cda7aa4e2	d26bbaa0-5038-41ed-9437-87a7b66ea312	a3a3670c-0e72-4a7a-b21c-259ea751ec59	kk	2026-03-26 12:44:53.766017
2c29680d-8b17-4823-ad3f-6f7f7085ba64	d26bbaa0-5038-41ed-9437-87a7b66ea312	85e03b40-d245-4589-b936-a7378796ad34	??	2026-03-26 12:45:07.156873
3c500c0d-c5e3-4cae-9107-1d28e7022f7e	d26bbaa0-5038-41ed-9437-87a7b66ea312	a3a3670c-0e72-4a7a-b21c-259ea751ec59	II	2026-03-26 12:47:11.850939
a652b8d4-9378-49f5-826d-0e7f5e9f107a	d26bbaa0-5038-41ed-9437-87a7b66ea312	a3a3670c-0e72-4a7a-b21c-259ea751ec59	HI	2026-03-27 08:49:58.641831
\.


--
-- Data for Name: group_resources; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.group_resources (id, group_id, resource_id, shared_by, created_at) FROM stdin;
\.


--
-- Data for Name: incident_reports; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.incident_reports (id, incident_type, severity, description, affected_users_count, affected_data_types, breach_scope, status, reported_by, reported_at, resolved_at, resolution_notes) FROM stdin;
\.


--
-- Data for Name: moderation_actions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.moderation_actions (id, moderator_id, action_type, target_user_id, target_content_type, target_content_id, abuse_report_id, details, ip_address, user_agent, created_at) FROM stdin;
\.


--
-- Data for Name: note_folders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.note_folders (id, user_id, name, parent_id, created_at, updated_at, color) FROM stdin;
39d8b8a5-7575-4244-86da-2dceeebd4817	a3a3670c-0e72-4a7a-b21c-259ea751ec59	Application Development	\N	2026-03-22 00:21:31.81038	2026-03-22 00:21:31.81038	#ef4444
58ed4e90-c34a-4c53-8ba6-983cb2a84e7b	a3a3670c-0e72-4a7a-b21c-259ea751ec59	Lectures	39d8b8a5-7575-4244-86da-2dceeebd4817	2026-03-22 00:22:32.0496	2026-03-22 00:22:32.0496	#ef4444
022487c9-7b20-4f29-9169-0e5a90d56d3f	a3a3670c-0e72-4a7a-b21c-259ea751ec59	Data and Web Development	\N	2026-03-22 02:00:55.748856	2026-03-22 02:00:55.748856	#6b7280
1cfa8586-d441-4d15-b826-8e15cf6d8554	a3a3670c-0e72-4a7a-b21c-259ea751ec59	Lectures	022487c9-7b20-4f29-9169-0e5a90d56d3f	2026-03-22 02:01:19.746935	2026-03-22 02:01:19.746935	#6b7280
fc0df13b-dc2d-417d-9a99-b6f692d8d215	b63f19d3-6b6a-4959-ac1c-a9cb793feb7c	App Dev	\N	2026-03-26 04:55:00.702967	2026-03-26 04:55:00.702967	#ef4444
\.


--
-- Data for Name: notes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notes (id, user_id, title, content, folder_id, tags, is_collaborative, created_at, updated_at, summary, summary_generated_at, summary_model, content_hash) FROM stdin;
fbae4b52-9670-49a9-8b75-19a8309d1d40	a3a3670c-0e72-4a7a-b21c-259ea751ec59	Product Tests	# Production Testing Guide\n\nComplete guide to test Resend email and Gemini AI summarization in production.\n\n## Pre-Testing Setup\n\n### 1. Deploy with Environment Variables\n\n**Vercel (Frontend):**\n```bash\nGEMINI_API_KEY=your-actual-gemini-key\n```\n\n**Render (Backend):**\n```bash\nRESEND_API_KEY=your-actual-resend-key\nEMAIL_FROM=Elevare <onboarding@resend.dev>\nNODE_ENV=production\n```\n\n### 2. Verify Deployment\n\nCheck both services are running:\n- Frontend: `https://your-app.vercel.app`\n- Backend: `https://your-backend.onrender.com/health`\n\n---\n\n## Test 1: Email Service (Resend)\n\n### A. Health Check\n\n**Test the email service is initialized:**\n```bash\n# Check backend logs on Render\n# Should see: "Email service initialized: Resend"\n```\n\n### B. Registration Flow (OTP Email)\n\n1. Go to `https://your-app.vercel.app/register`\n2. Fill in registration form with a **real Gmail address** (use your own or a test account)\n3. Click "Register"\n4. **Expected:** OTP email arrives within 5-10 seconds\n5. **Check:**\n   - Sender shows as "Elevare" (not "onboarding@resend.dev")\n   - Email is in inbox (not spam)\n   - OTP code is visible and formatted correctly\n   - Email template looks professional\n\n**If email doesn't arrive:**\n- Check Render logs for errors\n- Verify `RESEND_API_KEY` is set correctly\n- Check spam folder\n- Try with a different email provider (Yahoo, Outlook)\n\n### C. Password Reset Flow\n\n1. Go to `https://your-app.vercel.app/forgot-password`\n2. Enter your email\n3. Click "Send Reset Link"\n4. **Expected:** Password reset email arrives quickly\n5. **Check:**\n   - Email arrives within 5-10 seconds\n   - Reset link works and redirects correctly\n   - Email template is properly formatted\n\n### D. Resend Dashboard Verification\n\n1. Go to [resend.com/emails](https://resend.com/emails)\n2. **Check:**\n   - Your test emails appear in the logs\n   - Status shows "Delivered"\n   - No bounces or errors\n\n---\n\n## Test 2: AI Summarization (Gemini)\n\n### A. Health Check\n\n**Test the summarization service:**\n```bash\ncurl https://your-app.vercel.app/api/generate-summary\n```\n\n**Expected response:**\n```json\n{\n  "status": "healthy",\n  "service": "gemini",\n  "model": "gemini-1.5-flash",\n  "timestamp": "2024-..."\n}\n```\n\n**If you see `"service": "fastapi"` instead:**\n- `GEMINI_API_KEY` is not set in Vercel\n- Check Vercel → Settings → Environment Variables\n\n### B. Create and Summarize a Note\n\n1. Log in to your production app\n2. Go to Notes section\n3. Create a new note with substantial content (at least 200 words)\n   \n   **Sample content to paste:**\n   ```\n   Machine learning is a subset of artificial intelligence that focuses on \n   developing algorithms and statistical models that enable computers to \n   improve their performance on tasks through experience. Unlike traditional \n   programming where explicit instructions are provided, machine learning \n   systems learn patterns from data. There are three main types of machine \n   learning: supervised learning, where models learn from labeled data; \n   unsupervised learning, where models find patterns in unlabeled data; and \n   reinforcement learning, where agents learn through trial and error by \n   receiving rewards or penalties. Deep learning, a subset of machine learning, \n   uses neural networks with multiple layers to process complex patterns. \n   Applications of machine learning include image recognition, natural language \n   processing, recommendation systems, autonomous vehicles, and medical diagnosis.\n   ```\n\n4. Click the "Summarize" button (or equivalent in your UI)\n5. **Expected:**\n   - Summary generates in 1-3 seconds (much faster than FastAPI)\n   - Summary is 2-4 sentences\n   - Summary captures key points accurately\n   - No errors in browser console\n\n6. **Check the summary quality:**\n   - Is it coherent?\n   - Does it capture the main ideas?\n   - Is it concise (not just truncated text)?\n\n### C. Test with Different Content Types\n\n**Test 1: Short text (< 100 words)**\n- Should still generate a summary\n- May be 1-2 sentences\n\n**Test 2: Long text (> 1000 words)**\n- Should handle without timeout\n- Summary should still be concise\n\n**Test 3: Text with markdown formatting**\n- Create a note with **bold**, *italic*, `code`, etc.\n- Summary should be clean plain text (markdown stripped)\n\n### D. Browser DevTools Check\n\n1. Open browser DevTools (F12)\n2. Go to Network tab\n3. Trigger a summary\n4. Find the `/api/generate-summary` request\n5. **Check:**\n   - Status: 200 OK\n   - Response time: < 3 seconds\n   - Response includes `"model": "gemini-1.5-flash"`\n\n---\n\n## Test 3: Integration Test (Both Features)\n\n### Full User Journey\n\n1. **Register a new account**\n   - Use a fresh email address\n   - Verify OTP email arrives quickly (Resend)\n   - Complete registration\n\n2. **Create a note**\n   - Add substantial content\n   - Save the note\n\n3. **Generate summary**\n   - Click summarize\n   - Verify summary appears (Gemini)\n   - Check summary is saved to database\n\n4. **Test password reset**\n   - Log out\n   - Request password reset\n   - Verify email arrives (Resend)\n   - Complete password reset flow\n\n---\n\n## Monitoring & Debugging\n\n### Check Vercel Logs\n\n```bash\n# In Vercel dashboard → Deployments → [latest] → Functions\n# Look for /api/generate-summary logs\n```\n\n**Good log:**\n```\n[API] Using Gemini for summarization\n[API] Summary generated successfully\n```\n\n**Bad log:**\n```\n[API] Using FastAPI for summarization  # <- GEMINI_API_KEY not set!\n```\n\n### Check Render Logs\n\n```bash\n# In Render dashboard → Logs\n```\n\n**Good log:**\n```\nEmail service initialized: Resend\nOTP email sent { email: 'user@example.com', locale: 'en' }\n```\n\n**Bad log:**\n```\nEmail service initialized: SendGrid  # <- RESEND_API_KEY not set!\nFailed to send OTP email\n```\n\n### Check API Keys\n\n**Gemini:**\n- Go to [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)\n- Verify key is active\n- Check usage/quota\n\n**Resend:**\n- Go to [resend.com/api-keys](https://resend.com/api-keys)\n- Verify key is active\n- Check [resend.com/emails](https://resend.com/emails) for delivery logs\n\n---\n\n## Common Issues & Fixes\n\n### Issue: Emails not arriving\n\n**Check:**\n1. Render logs show "Email service initialized: Resend"?\n2. `RESEND_API_KEY` set in Render environment?\n3. Check spam folder\n4. Check [resend.com/emails](https://resend.com/emails) for delivery status\n\n**Fix:**\n- Verify `RESEND_API_KEY` is correct\n- Redeploy backend after adding env var\n- Try different email provider (not just Gmail)\n\n### Issue: Summaries timing out or failing\n\n**Check:**\n1. Vercel logs show "Using Gemini for summarization"?\n2. `GEMINI_API_KEY` set in Vercel environment?\n3. Browser console for errors\n\n**Fix:**\n- Add `GEMINI_API_KEY` to Vercel\n- Redeploy frontend\n- Verify key at [aistudio.google.com](https://aistudio.google.com)\n\n### Issue: Still using old services (FastAPI/Gmail SMTP)\n\n**This means environment variables aren't set:**\n- Check Vercel → Settings → Environment Variables\n- Check Render → Environment\n- Redeploy both services after adding vars\n\n---\n\n## Performance Benchmarks\n\n### Expected Performance\n\n**Resend Email:**\n- Delivery time: 5-15 seconds\n- Success rate: > 99%\n- Spam rate: < 1%\n\n**Gemini Summarization:**\n- Response time: 1-3 seconds\n- Success rate: > 99%\n- Quality: High (coherent, accurate summaries)\n\n**Compare to old setup:**\n- Gmail SMTP: 30-60 seconds, often spam\n- FastAPI: 10-30 seconds, requires server\n\n---\n\n## Test Checklist\n\nUse this checklist during testing:\n\n**Email (Resend):**\n- [ ] Registration OTP arrives quickly\n- [ ] Password reset email arrives quickly\n- [ ] Emails show "Elevare" as sender\n- [ ] Emails not in spam folder\n- [ ] Email templates render correctly\n- [ ] Resend dashboard shows deliveries\n\n**AI Summary (Gemini):**\n- [ ] Health check returns `"service": "gemini"`\n- [ ] Summaries generate in < 3 seconds\n- [ ] Summary quality is good\n- [ ] Works with short text (< 100 words)\n- [ ] Works with long text (> 1000 words)\n- [ ] Markdown is stripped correctly\n- [ ] No timeout errors\n\n**Integration:**\n- [ ] Full registration → login → summarize flow works\n- [ ] Password reset flow works end-to-end\n- [ ] No errors in browser console\n- [ ] No errors in Vercel/Render logs\n\n---\n\n## For Your Viva Defense\n\nWhen explaining these features:\n\n**Email System:**\n> "We use Resend for production email delivery because it provides better deliverability than Gmail SMTP without requiring domain verification. The system automatically detects the environment — development uses local SMTP for testing, production uses Resend API. This architecture allows us to test email flows locally without external dependencies while ensuring reliable delivery in production."\n\n**AI Summarization:**\n> "We implemented a dual-provider strategy for AI summarization. Development uses a self-hosted FastAPI service with the BART transformer model to demonstrate understanding of ML model deployment. Production uses Google's Gemini 1.5 Flash API for cost-effectiveness and reliability. The system detects which provider to use based on environment variables, allowing seamless switching without code changes. This approach balances learning objectives with production requirements."\n\n**Testing Strategy:**\n> "We validated both features through integration testing in production. For emails, we verified delivery time, spam rates, and template rendering across multiple email providers. For AI summarization, we tested response times, summary quality, and edge cases like very short or very long texts. Both features show significant improvements over the previous implementation — email delivery improved from 30-60 seconds to 5-15 seconds, and summarization latency decreased from 10-30 seconds to 1-3 seconds."\n	\N	{Test}	f	2026-03-21 09:47:46.747317	2026-03-21 13:31:59.044978	Here is a 2-4 sentence summary of the text:\n\nThis guide outlines the testing process for two features in a production environment: Resend email and Gemini AI summarization. The guide includes pre-testing setup, test cases for email service (resend) and AI summarization (Gemini), and a checklist for verifying the features' functionality. The tests cover health checks, registration and password reset flows, summary generation, and edge cases. The guide also provides a testing strategy and example explanations for defending the features in a Viva defense.	2026-03-21 12:06:32.749	PEGASUS	97297f5fcae167cf1c3d3880a18dcd14baba851da03c23a491d71e489c36237a
1e0e909f-3509-4f1e-989b-48aa2a1cba23	a3a3670c-0e72-4a7a-b21c-259ea751ec59	Lecture-19	# Lecture 19 — Database Driven Applications\n\n## 1. What is a Database Driven Application?\n\nA **database-driven application** is one that interacts with a database to **store**, **retrieve**, and **update** information dynamically. Almost all modern web and enterprise applications follow this pattern.\n\n### Traditional Approach (Legacy)\n| Aspect | Description |\n|---|---|\n| Query Style | Raw SQL strings embedded in code |\n| Data Mapping | Manual — developer writes boilerplate to map rows → objects |\n| Abstraction | None — tightly coupled to the database engine |\n\n### Modern Approach\nUse an **ORM (Object Relational Mapper)** to abstract away raw SQL, reduce boilerplate, and work with plain C# objects instead of raw database rows.\n\n---\n\n## 2. ORM — Object Relational Mapping\n\nAn ORM bridges the gap between the **object-oriented world** (C# classes) and the **relational world** (database tables).\n\n| Feature | Description |\n|---|---|\n| Abstraction | Write C# instead of SQL |\n| Type Safety | Compile-time checking of queries |\n| Portability | Switch databases with minimal code change |\n| Productivity | Reduces boilerplate data-access code |\n\n### EF Core (Entity Framework Core)\n\nThe ORM used in this module is **Entity Framework Core (EF Core)** — Microsoft's official, modern ORM.\n\n**Key characteristics:**\n- Cross-platform (.NET on Windows, Linux, macOS)\n- Lightweight and modular\n- Code-First development approach\n- Uses **LINQ** (Language Integrated Query) for type-safe queries\n\n### Setup & Installation\n\nEF Core is composed of a **base package** plus a **database provider package**:\n\n```bash\n# Base package (always required)\ndotnet add package Microsoft.EntityFrameworkCore\n\n# Choose your database provider:\ndotnet add package Microsoft.EntityFrameworkCore.SqlServer   # SQL Server\ndotnet add package Npgsql.EntityFrameworkCore.PostgreSQL    # PostgreSQL\ndotnet add package Pomelo.EntityFrameworkCore.MySql         # MySQL\ndotnet add package Microsoft.EntityFrameworkCore.Sqlite     # SQLite\n```\n\n---\n\n## 3. Model (Entity)\n\nA **Model** (also called an **Entity**) is a C# class that represents the structure of a database table. Each **property** in the class maps to a **column** in the table.\n\n```csharp\npublic class Book\n{\n    public int Id { get; set; }           // Primary Key\n    public string Title { get; set; }\n    public string Author { get; set; }\n    public DateTime PublishedDate { get; set; }\n}\n```\n\n### 3.1 Configuring a Model via Data Annotations\n\nData Annotations are **attributes** applied directly to the class or its properties.\n\n| Namespace | Purpose |\n|---|---|\n| `System.ComponentModel.DataAnnotations` | Constraints (Required, MaxLength, etc.) |\n| `System.ComponentModel.DataAnnotations.Schema` | Table/column mapping |\n\n```csharp\nusing System.ComponentModel.DataAnnotations;\nusing System.ComponentModel.DataAnnotations.Schema;\n\n[Table("Books")]\npublic class Book\n{\n    [Key]\n    public int Id { get; set; }\n\n    [Required]\n    [MaxLength(200)]\n    public string Title { get; set; }\n\n    [Column("author_name")]\n    public string Author { get; set; }\n\n    [NotMapped]\n    public string ComputedProperty { get; set; }   // Excluded from DB\n}\n```\n\n**Common annotations:**\n\n| Annotation | Effect |\n|---|---|\n| `[Key]` | Marks property as Primary Key |\n| `[Required]` | Column is NOT NULL |\n| `[MaxLength(n)]` | Sets max string length |\n| `[Column("name")]` | Overrides column name |\n| `[Table("name")]` | Overrides table name |\n| `[NotMapped]` | Excludes property from the schema |\n| `[ForeignKey("prop")]` | Marks a foreign key relationship |\n\n### 3.2 Configuring a Model via Fluent API\n\nThe **Fluent API** is an alternative (and more powerful) way to configure models. It is defined inside `DbContext` by overriding `OnModelCreating`, or by creating dedicated **Entity Type Configuration** classes.\n\n```csharp\n// Inside DbContext\nprotected override void OnModelCreating(ModelBuilder modelBuilder)\n{\n    modelBuilder.Entity<Book>(entity =>\n    {\n        entity.ToTable("Books");\n        entity.HasKey(b => b.Id);\n        entity.Property(b => b.Title).IsRequired().HasMaxLength(200);\n        entity.Property(b => b.Author).HasColumnName("author_name");\n    });\n}\n```\n\n**Using a dedicated configuration class (recommended for large projects):**\n\n```csharp\npublic class BookConfiguration : IEntityTypeConfiguration<Book>\n{\n    public void Configure(EntityTypeBuilder<Book> builder)\n    {\n        builder.ToTable("Books");\n        builder.HasKey(b => b.Id);\n        builder.Property(b => b.Title).IsRequired().HasMaxLength(200);\n    }\n}\n\n// Register in DbContext:\nprotected override void OnModelCreating(ModelBuilder modelBuilder)\n{\n    modelBuilder.ApplyConfiguration(new BookConfiguration());\n    // Or apply all configs in an assembly at once:\n    // modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);\n}\n```\n\n---\n\n## 4. Relationships\n\nEF Core supports all standard relational database relationships.\n\n### 4.1 One-to-One\n\nEach entity on both sides relates to **exactly one** entity on the other side.\n\n> **Example:** Each `Book` has exactly one `CoverImage`, and each `CoverImage` belongs to exactly one `Book`.\n\n```csharp\npublic class Book\n{\n    public int Id { get; set; }\n    public string Title { get; set; }\n    public CoverImage CoverImage { get; set; }   // Navigation property\n}\n\npublic class CoverImage\n{\n    public int Id { get; set; }\n    public string Url { get; set; }\n    public int BookId { get; set; }              // Foreign key\n    public Book Book { get; set; }               // Navigation property\n}\n```\n\n### 4.2 One-to-Many\n\nOne entity on the "one" side relates to **many** entities on the "many" side.\n\n> **Example:** A `Series` can include many `Books`, but each `Book` belongs to at most one `Series`.\n\n```csharp\npublic class Series\n{\n    public int Id { get; set; }\n    public string Name { get; set; }\n    public ICollection<Book> Books { get; set; }  // "Many" side\n}\n\npublic class Book\n{\n    public int Id { get; set; }\n    public string Title { get; set; }\n    public int? SeriesId { get; set; }           // Foreign key (nullable = optional)\n    public Series Series { get; set; }\n}\n```\n\n### 4.3 Many-to-Many (Implicit)\n\nEF Core 5+ supports **implicit** many-to-many without requiring an explicit bridge class. EF Core creates a hidden join table automatically.\n\n> **Example:** A `Book` can belong to multiple `Genres`, and a `Genre` contains multiple `Books`.\n\n```csharp\npublic class Book\n{\n    public int Id { get; set; }\n    public string Title { get; set; }\n    public ICollection<Genre> Genres { get; set; }\n}\n\npublic class Genre\n{\n    public int Id { get; set; }\n    public string Name { get; set; }\n    public ICollection<Book> Books { get; set; }\n}\n```\n\n### 4.4 Many-to-Many (Explicit Bridge Table)\n\nUse an **explicit bridge entity** when you need to store additional data on the relationship itself (e.g., a date or a role).\n\n> **Example:** A `Book` can have many `Authors`, and an `Author` can write many `Books`. The bridge `BookAuthor` records the role each author played.\n\n```csharp\npublic class BookAuthor               // Bridge entity\n{\n    public int BookId { get; set; }\n    public Book Book { get; set; }\n\n    public int AuthorId { get; set; }\n    public Author Author { get; set; }\n\n    public string Role { get; set; }  // Extra data on the relationship\n}\n\n// Configure composite key via Fluent API:\nmodelBuilder.Entity<BookAuthor>()\n    .HasKey(ba => new { ba.BookId, ba.AuthorId });\n```\n\n---\n\n## 5. DbContext\n\n`DbContext` is the **central class** in EF Core. It represents your database session and exposes `DbSet<T>` properties for each entity, which you use to query and save data.\n\n```csharp\npublic class AppDbContext : DbContext\n{\n    public AppDbContext(DbContextOptions<AppDbContext> options)\n        : base(options) { }\n\n    // Each DbSet maps to a table\n    public DbSet<Book> Books { get; set; }\n    public DbSet<Genre> Genres { get; set; }\n    public DbSet<Series> Series { get; set; }\n    public DbSet<CoverImage> CoverImages { get; set; }\n\n    protected override void OnModelCreating(ModelBuilder modelBuilder)\n    {\n        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);\n    }\n}\n```\n\n**Registering DbContext in `Program.cs`:**\n\n```csharp\nbuilder.Services.AddDbContext<AppDbContext>(options =>\n    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));\n```\n\n**Common DbContext operations:**\n\n| Operation | Code Example |\n|---|---|\n| Query all | `context.Books.ToList()` |\n| Query with filter | `context.Books.Where(b => b.Author == "Tolkien")` |\n| Find by key | `context.Books.Find(id)` |\n| Add record | `context.Books.Add(book)` |\n| Update record | `context.Books.Update(book)` |\n| Delete record | `context.Books.Remove(book)` |\n| Save changes | `context.SaveChanges()` |\n\n---\n\n## 6. Migrations\n\n**Migrations** are EF Core's mechanism for **evolving the database schema** in sync with your C# model changes. Instead of writing manual SQL `ALTER TABLE` scripts, EF Core generates them for you.\n\n### Workflow\n\n```\nModel Change → Add Migration → Review SQL → Apply to Database\n```\n\n### Common Migration Commands\n\n```bash\n# Create a new migration (after changing your models)\ndotnet ef migrations add <MigrationName>\n\n# Example:\ndotnet ef migrations add AddBookPublishedDate\n\n# Apply all pending migrations to the database\ndotnet ef database update\n\n# Roll back to a specific migration\ndotnet ef database update <PreviousMigrationName>\n\n# Remove the last unapplied migration\ndotnet ef migrations remove\n\n# Generate the SQL script for a migration (for review or manual execution)\ndotnet ef migrations script\n```\n\n### What Gets Generated\n\nEach migration creates two methods inside a C# file:\n\n```csharp\npublic partial class AddBookPublishedDate : Migration\n{\n    // Applied when running `database update`\n    protected override void Up(MigrationBuilder migrationBuilder)\n    {\n        migrationBuilder.AddColumn<DateTime>(\n            name: "PublishedDate",\n            table: "Books",\n            nullable: true);\n    }\n\n    // Applied when rolling back\n    protected override void Down(MigrationBuilder migrationBuilder)\n    {\n        migrationBuilder.DropColumn(\n            name: "PublishedDate",\n            table: "Books");\n    }\n}\n```\n\n### Best Practices\n\n- Always review the generated migration file before applying it\n-  Give migrations descriptive names (`AddBookPublishedDate` not `Migration1`)\n- Commit migration files to source control\n- Never modify an already-applied migration — create a new one instead\n- Use `dotnet ef migrations script` to produce SQL for production deployments\n\n---\n\n## Summary\n\n```\nC# Models (Entities)\n       ↓  configure via Data Annotations or Fluent API\nDbContext (AppDbContext)\n       ↓  registers models, relationships, and config\nMigrations\n       ↓  generates and applies schema changes to the DB\nDatabase (PostgreSQL / MySQL / SQL Server / SQLite)\n```\n\n| Concept | Role |\n|---|---|\n| **Model / Entity** | C# class representing a DB table |\n| **DbContext** | Session manager — queries, inserts, updates, deletes |\n| **Data Annotations** | Attribute-based model configuration |\n| **Fluent API** | Code-based, more powerful model configuration |\n| **Migrations** | Version-controlled schema evolution |\n| **Relationships** | One-to-One, One-to-Many, Many-to-Many |	58ed4e90-c34a-4c53-8ba6-983cb2a84e7b	{Lecture,"App Dev"}	f	2026-03-22 00:23:26.344124	2026-03-22 00:23:26.344124	A database-driven application interacts with a database to store, retrieve, and update information dynamically. Entity Framework Core (EF Core) is a modern Object Relational Mapping (ORM) tool that abstracts away raw SQL, reducing boilerplate code and improving productivity. EF Core allows developers to work with C# objects instead of raw database rows, providing features such as type safety, portability, and abstraction. It supports various database relationships, migrations, and provides a central class, DbContext, for managing database sessions.	2026-03-22 00:23:25.809	PEGASUS	e13072561bf6f9d4524362c3edc55a8214d674ebab0cc53a6a88af5a319d1196
6c45dc35-3eae-4f4d-85b7-a404630a0dd0	b63f19d3-6b6a-4959-ac1c-a9cb793feb7c	Lecture-21(Clean Architecture)	# Lecture Notes - Clean Architecture\n\n**Date:** 26/03/2026\n\n## 🎯 Learning Objectives\n- Software Architecture\n- Clean Architecture\n- Data Transfer Objects(DTO)\n- API Response\n- Common Mistakes\n\n## 📚 Key Concepts\n\n### **Software Architecture**\nIt is the set of high-level decisions that determine how a system is built an dhow its component interact. The ultimate goal of software architecture is to minimise the lifetime cost of the system.\n\nIts main goals are \n- **Sustainability**( Can we keep adding features at the same speed in the future?),\n- **Understandability**( Can a new developer join the team and know where to put a new piece of logic) and \n- **Agility**( can we swap out something without rewriting the whole app?).\n\nThe history went from **Monolith**(everything lived in one place) to **N-Tier Architecture/Layered Architecture** where layers are divided by UI, Business and Data. The problem with it was that it was database centric. \n\nFinally, **Onion Architecture/Clean Architecture** was developed where business logic was made the centre instead of database and database was treated as an external layer.\n\n### **Clean Architecture**\nIt is a design pattern introduced by Robert C. Martin for building maintainable and scalable applications. Its rules are:\n- Independent of Framework\n- Testable\n- Independent of the UI\n- Independent of the Database\n_ Independent of any external agency\n\n#### **Principles**\n1. **Separation of Concerns**: Each layer has a specific responsibility like Controller only handles HTTP requests.\n\n2. **The Dependency Rule**\n\n\n#### **Layers**\n\n1. **Presentation Layer (API/Controllers)** \n2. **Application Layer (Services/Business Logic)**\n3. **Domain Layer (Entities/Models)**\n4. **Infrastructure Layer(Database/ External Services)**\n\n### Data Transfer Objects\n\nTo maintain separation , we never expose our entities directly to the client. **DTOs** are simple objects used to transfer object between layers.\n\n### API Response\n\nA generic wrapper for all API outputs to ensure consistency or have responses for both success and failure cases. \n\n### Common Mistakes\n\n* Placing business logic in controllers\n* Exposing database entities directly\n* Tight coupling between layers\n* Not using interfaces or DTos\n\n### Important Points\n- Clean Architecture separates each layer properly\n- It is more of a logical approach rather than coding \n- Architecture is ever developing to make coding/development process easier.\n\n\n\n### Questions for Review\n- [ ] Deep Understanding of DTOs\n- [ ] Who introduced Clean Architecture\n- [ ] Understanding Tight Coupling\n\n### Next Steps\n- [ ] Practice exercises\n- [ ] Review materials\n- [ ] Prepare for next session	fc0df13b-dc2d-417d-9a99-b6f692d8d215	{}	f	2026-03-26 05:32:41.700165	2026-03-27 08:36:58.494996	Software Architecture is a set of high-level decisions determining how a system is built and its components interact, with the ultimate goal of minimizing the lifetime cost of the system. Its main goals are sustainability, understandability, and agility. The evolution of software architecture has progressed from Monolith to N-Tier Architecture, and finally, to Onion Architecture/Clean Architecture, which places business logic at the center and treats the database as an external layer.\n\nClean Architecture is a design pattern introduced by Robert C. Martin for building maintainable and scalable applications. Its key rules include being independent of frameworks, testable, and independent of the UI, database, and any external agency. The principles of Clean Architecture include separation of concerns and the dependency rule, which dictate that layers should not depend on each other but rather be loosely coupled.\n\nThe Clean Architecture layers are:\n\n1. Presentation Layer (API/Controllers): handles HTTP requests\n2. Application Layer (Services/Business Logic): contains business logic\n3. Domain Layer (Entities/Models): contains domain-specific logic\n4. Infrastructure Layer (Database/External Services): contains external dependencies\n\nTo maintain separation, Data Transfer Objects (DTOs) are used to transfer objects between layers, and API Responses are used to ensure consistency in API outputs. Common mistakes to avoid include placing business logic in controllers, exposing database entities directly, and tight coupling between layers.\n\nImportant points about Clean Architecture include its ability to separate each layer properly, its logical approach rather than coding, and the fact that architecture is ever-evolving to make coding and development easier.	2026-03-26 05:32:40.361	PEGASUS	3c71ad4edbde8772fdd16689e3a68698900f31debeb7cd3c1c0b9311b00ab9dc
\.


--
-- Data for Name: notification_preferences; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notification_preferences (id, user_id, notification_type, enabled, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notifications (id, user_id, type, title, content, link, is_read, created_at) FROM stdin;
b5dff773-9c34-4683-8833-8d1fccada1a5	a3a3670c-0e72-4a7a-b21c-259ea751ec59	join_request_received	New Join Request	Elevare has requested to join "Elevare".	/en/groups/d26bbaa0-5038-41ed-9437-87a7b66ea312	t	2026-03-07 14:21:23.009608
a61ae7f2-8177-4fc1-a88d-3d1863b6960c	a3a3670c-0e72-4a7a-b21c-259ea751ec59	video_call_started	Video Call Started	Elevare started a video call in Elevare	/en/groups/d26bbaa0-5038-41ed-9437-87a7b66ea312/video-call	t	2026-03-07 14:22:51.20476
c8c161ca-2cbf-49f7-a507-5b6ff18bca65	a3a3670c-0e72-4a7a-b21c-259ea751ec59	video_call_started	Video Call Started	Elevare started a video call in Elevare	/en/groups/d26bbaa0-5038-41ed-9437-87a7b66ea312/video-call	t	2026-03-07 14:53:08.564885
0e8aa543-7e74-45ec-b674-b08692a53cc9	a3a3670c-0e72-4a7a-b21c-259ea751ec59	video_call_started	Video Call Started	Elevare started a video call in Elevare	/en/groups/d26bbaa0-5038-41ed-9437-87a7b66ea312/video-call	t	2026-03-07 15:12:24.412247
10f1cd89-6968-4731-b1a2-dc66dcfcb960	a3a3670c-0e72-4a7a-b21c-259ea751ec59	video_call_started	Video Call Started	Elevare started a video call in Elevare	/en/groups/d26bbaa0-5038-41ed-9437-87a7b66ea312/video-call	t	2026-03-07 15:17:49.865228
4df9b217-8c77-4846-afd0-25dfb5adeeed	b63f19d3-6b6a-4959-ac1c-a9cb793feb7c	video_call_started	Video Call Started	Abdul Razzaq Ansari started a video call in Elevare	/en/groups/d26bbaa0-5038-41ed-9437-87a7b66ea312/video-call	t	2026-03-08 02:06:05.181671
b2f21344-64ae-4489-a99c-d7e3e0762400	b63f19d3-6b6a-4959-ac1c-a9cb793feb7c	video_call_started	Video Call Started	Abdul Razzaq Ansari started a video call in Elevare	/en/groups/d26bbaa0-5038-41ed-9437-87a7b66ea312/video-call	t	2026-03-25 12:47:18.711994
77a179b1-9e65-48ff-8216-24f500726b91	b63f19d3-6b6a-4959-ac1c-a9cb793feb7c	join_request_approved	Join Request Approved	Your request to join "Elevare" has been approved. Welcome to the group!	/en/groups/d26bbaa0-5038-41ed-9437-87a7b66ea312	t	2026-03-07 14:21:54.220468
6d3b8df9-00eb-4b4e-b1ae-4483f6f0aa72	b63f19d3-6b6a-4959-ac1c-a9cb793feb7c	video_call_started	Video Call Started	Abdul Razzaq Ansari started a video call in Elevare	/en/groups/d26bbaa0-5038-41ed-9437-87a7b66ea312/video-call	t	2026-03-07 14:41:00.686558
261af445-3e3a-42c9-84e0-1edc11d47aec	b63f19d3-6b6a-4959-ac1c-a9cb793feb7c	video_call_started	Video Call Started	Abdul Razzaq Ansari started a video call in Elevare	/en/groups/d26bbaa0-5038-41ed-9437-87a7b66ea312/video-call	t	2026-03-07 15:40:36.856996
0d65049a-170c-4c1c-bd64-410f3e8af702	b63f19d3-6b6a-4959-ac1c-a9cb793feb7c	video_call_started	Video Call Started	Abdul Razzaq Ansari started a video call in Elevare	/en/groups/d26bbaa0-5038-41ed-9437-87a7b66ea312/video-call	t	2026-03-08 02:15:32.685633
b83c1d05-c176-4715-9d6e-b053c1a6b2a7	b63f19d3-6b6a-4959-ac1c-a9cb793feb7c	video_call_started	Video Call Started	Abdul Razzaq Ansari started a video call in Elevare	/en/groups/d26bbaa0-5038-41ed-9437-87a7b66ea312/video-call	t	2026-03-08 04:44:18.258823
9c33ecf5-4526-48fe-8d27-b6cc8e42efd9	a3a3670c-0e72-4a7a-b21c-259ea751ec59	video_call_started	Video Call Started	Elevare started a video call in Elevare	/en/groups/d26bbaa0-5038-41ed-9437-87a7b66ea312/video-call	t	2026-03-26 06:08:33.479225
a20ff3b4-f4c6-4f75-ac63-1d4b48c45ccf	85e03b40-d245-4589-b936-a7378796ad34	join_request_approved	Join Request Approved	Your request to join "Elevare" has been approved. Welcome to the group!	/en/groups/d26bbaa0-5038-41ed-9437-87a7b66ea312	f	2026-03-26 11:41:56.110515
447bde92-687c-489a-8737-349b916fd207	b63f19d3-6b6a-4959-ac1c-a9cb793feb7c	video_call_started	Video Call Started	Abdul Razzaq Ansari started a video call in Elevare	/en/groups/d26bbaa0-5038-41ed-9437-87a7b66ea312/video-call	f	2026-03-26 11:44:30.33321
2b29626a-7dff-447c-b389-aa73eeb40b50	85e03b40-d245-4589-b936-a7378796ad34	video_call_started	Video Call Started	Abdul Razzaq Ansari started a video call in Elevare	/en/groups/d26bbaa0-5038-41ed-9437-87a7b66ea312/video-call	f	2026-03-26 11:44:30.336454
72a37712-a7a4-449d-9eec-a08f73516b81	a728c824-0f73-4fa3-8296-78dfd82d325f	join_request_approved	Join Request Approved	Your request to join "Elevare" has been approved. Welcome to the group!	/en/groups/d26bbaa0-5038-41ed-9437-87a7b66ea312	t	2026-03-26 11:44:57.059009
34575282-7f5f-4748-ab62-6bc28ccb1dbf	f810b345-d156-4d69-9cb9-486492218e7d	join_request_approved	Join Request Approved	Your request to join "Elevare" has been approved. Welcome to the group!	/en/groups/d26bbaa0-5038-41ed-9437-87a7b66ea312	t	2026-03-26 11:44:20.197235
e262a617-cb52-45f7-87ed-d18f6897d2b9	f810b345-d156-4d69-9cb9-486492218e7d	video_call_started	Video Call Started	Abdul Razzaq Ansari started a video call in Elevare	/en/groups/d26bbaa0-5038-41ed-9437-87a7b66ea312/video-call	t	2026-03-26 11:44:30.33922
09f5171a-dff0-44c6-ab37-3f137248d979	b63f19d3-6b6a-4959-ac1c-a9cb793feb7c	video_call_started	Video Call Started	Rinobito started a video call in Elevare	/en/groups/d26bbaa0-5038-41ed-9437-87a7b66ea312/video-call	f	2026-03-26 11:53:38.56089
8afae1d4-5ce2-4e8b-a659-955e78178943	85e03b40-d245-4589-b936-a7378796ad34	video_call_started	Video Call Started	Rinobito started a video call in Elevare	/en/groups/d26bbaa0-5038-41ed-9437-87a7b66ea312/video-call	f	2026-03-26 11:53:38.571233
c8382700-322d-4f44-a2af-44cc7a8b5d19	f810b345-d156-4d69-9cb9-486492218e7d	video_call_started	Video Call Started	Rinobito started a video call in Elevare	/en/groups/d26bbaa0-5038-41ed-9437-87a7b66ea312/video-call	f	2026-03-26 11:53:38.576188
0543fe2a-85b1-4c86-b688-9ce9e8faa50e	b63f19d3-6b6a-4959-ac1c-a9cb793feb7c	video_call_started	Video Call Started	Abdul Razzaq Ansari started a video call in Elevare	/en/groups/d26bbaa0-5038-41ed-9437-87a7b66ea312/video-call	f	2026-03-26 12:18:11.107946
c9adada8-5a16-4c72-8d4c-614dd7104303	85e03b40-d245-4589-b936-a7378796ad34	video_call_started	Video Call Started	Abdul Razzaq Ansari started a video call in Elevare	/en/groups/d26bbaa0-5038-41ed-9437-87a7b66ea312/video-call	f	2026-03-26 12:18:11.115951
4d56b58e-2ba5-4936-9948-2d151ca4e83f	f810b345-d156-4d69-9cb9-486492218e7d	video_call_started	Video Call Started	Abdul Razzaq Ansari started a video call in Elevare	/en/groups/d26bbaa0-5038-41ed-9437-87a7b66ea312/video-call	f	2026-03-26 12:18:11.120318
86fea343-1f3f-4b18-b9e3-238beb435c6c	a728c824-0f73-4fa3-8296-78dfd82d325f	video_call_started	Video Call Started	Abdul Razzaq Ansari started a video call in Elevare	/en/groups/d26bbaa0-5038-41ed-9437-87a7b66ea312/video-call	f	2026-03-26 12:18:11.123269
02f3bc3f-b950-4be9-9c2d-3767f95c0b50	b63f19d3-6b6a-4959-ac1c-a9cb793feb7c	video_call_started	Video Call Started	Abdul Razzaq Ansari started a video call in Elevare	/en/groups/d26bbaa0-5038-41ed-9437-87a7b66ea312/video-call	f	2026-03-26 12:46:20.0789
189125ff-77d8-4f6a-9e06-c8b8bf2f54eb	85e03b40-d245-4589-b936-a7378796ad34	video_call_started	Video Call Started	Abdul Razzaq Ansari started a video call in Elevare	/en/groups/d26bbaa0-5038-41ed-9437-87a7b66ea312/video-call	f	2026-03-26 12:46:20.089955
8f3a4f46-3e61-4f2b-b1c1-0393f70148e4	f810b345-d156-4d69-9cb9-486492218e7d	video_call_started	Video Call Started	Abdul Razzaq Ansari started a video call in Elevare	/en/groups/d26bbaa0-5038-41ed-9437-87a7b66ea312/video-call	f	2026-03-26 12:46:20.095945
271a51b0-4d6f-49ff-9bf7-07f0de8eacfa	a728c824-0f73-4fa3-8296-78dfd82d325f	video_call_started	Video Call Started	Abdul Razzaq Ansari started a video call in Elevare	/en/groups/d26bbaa0-5038-41ed-9437-87a7b66ea312/video-call	f	2026-03-26 12:46:20.104843
23fa83aa-a321-4e48-bf4a-eb332ab19eff	b63f19d3-6b6a-4959-ac1c-a9cb793feb7c	video_call_started	Video Call Started	Abdul Razzaq Ansari started a video call in Elevare	/en/groups/d26bbaa0-5038-41ed-9437-87a7b66ea312/video-call	f	2026-03-26 12:53:09.222539
43908d67-7216-49ed-b41b-16af4b738f0c	85e03b40-d245-4589-b936-a7378796ad34	video_call_started	Video Call Started	Abdul Razzaq Ansari started a video call in Elevare	/en/groups/d26bbaa0-5038-41ed-9437-87a7b66ea312/video-call	f	2026-03-26 12:53:09.233974
a7f112b9-a918-46a2-94af-ecb951c53f80	f810b345-d156-4d69-9cb9-486492218e7d	video_call_started	Video Call Started	Abdul Razzaq Ansari started a video call in Elevare	/en/groups/d26bbaa0-5038-41ed-9437-87a7b66ea312/video-call	f	2026-03-26 12:53:09.23845
959b18a4-1eca-48c1-a374-161b1f14ed05	a728c824-0f73-4fa3-8296-78dfd82d325f	video_call_started	Video Call Started	Abdul Razzaq Ansari started a video call in Elevare	/en/groups/d26bbaa0-5038-41ed-9437-87a7b66ea312/video-call	f	2026-03-26 12:53:09.250936
39625e0c-1a65-4a0e-bdd6-266f1b9ff190	b63f19d3-6b6a-4959-ac1c-a9cb793feb7c	video_call_started	Video Call Started	Abdul Razzaq Ansari started a video call in Elevare	/en/groups/d26bbaa0-5038-41ed-9437-87a7b66ea312/video-call	f	2026-03-26 13:07:43.939801
de8bbbb5-1615-41ae-8851-77c139869a52	85e03b40-d245-4589-b936-a7378796ad34	video_call_started	Video Call Started	Abdul Razzaq Ansari started a video call in Elevare	/en/groups/d26bbaa0-5038-41ed-9437-87a7b66ea312/video-call	f	2026-03-26 13:07:43.943768
3244abd0-b3f4-41e7-9dd3-f9617e9c8ada	f810b345-d156-4d69-9cb9-486492218e7d	video_call_started	Video Call Started	Abdul Razzaq Ansari started a video call in Elevare	/en/groups/d26bbaa0-5038-41ed-9437-87a7b66ea312/video-call	f	2026-03-26 13:07:43.946659
59f39eb2-acef-43eb-8ae6-2a59684e70e6	a728c824-0f73-4fa3-8296-78dfd82d325f	video_call_started	Video Call Started	Abdul Razzaq Ansari started a video call in Elevare	/en/groups/d26bbaa0-5038-41ed-9437-87a7b66ea312/video-call	f	2026-03-26 13:07:43.949796
0773647e-4baf-4d95-bdcb-818805bd61c4	a3a3670c-0e72-4a7a-b21c-259ea751ec59	join_request_received	New Join Request	Preyanshu Shah has requested to join "Elevare".	/en/groups/d26bbaa0-5038-41ed-9437-87a7b66ea312	f	2026-03-26 13:10:55.665335
b885bfd8-25e2-4f9b-b0fb-9e6c4d166bc1	67b9ed97-23a9-4c1b-9e9f-9e88cc3c017f	join_request_approved	Join Request Approved	Your request to join "Elevare" has been approved. Welcome to the group!	/en/groups/d26bbaa0-5038-41ed-9437-87a7b66ea312	f	2026-03-26 13:11:01.400494
76d85980-a7bb-4aca-bf4d-5a0b05c50ad2	b63f19d3-6b6a-4959-ac1c-a9cb793feb7c	video_call_started	Video Call Started	Abdul Razzaq Ansari started a video call in Elevare	/en/groups/d26bbaa0-5038-41ed-9437-87a7b66ea312/video-call	f	2026-03-26 13:11:11.768706
3adc27ab-f43c-487c-b66a-5ac4d5c7c1b0	85e03b40-d245-4589-b936-a7378796ad34	video_call_started	Video Call Started	Abdul Razzaq Ansari started a video call in Elevare	/en/groups/d26bbaa0-5038-41ed-9437-87a7b66ea312/video-call	f	2026-03-26 13:11:11.774641
4a8ca431-333e-4ea5-a2f2-21280e7c1065	f810b345-d156-4d69-9cb9-486492218e7d	video_call_started	Video Call Started	Abdul Razzaq Ansari started a video call in Elevare	/en/groups/d26bbaa0-5038-41ed-9437-87a7b66ea312/video-call	f	2026-03-26 13:11:11.778569
b58f2be4-67f0-4b81-a9e3-fba870aa5a8b	a728c824-0f73-4fa3-8296-78dfd82d325f	video_call_started	Video Call Started	Abdul Razzaq Ansari started a video call in Elevare	/en/groups/d26bbaa0-5038-41ed-9437-87a7b66ea312/video-call	f	2026-03-26 13:11:11.783496
590749e1-1f33-47cc-8de9-457a19b24087	67b9ed97-23a9-4c1b-9e9f-9e88cc3c017f	video_call_started	Video Call Started	Abdul Razzaq Ansari started a video call in Elevare	/en/groups/d26bbaa0-5038-41ed-9437-87a7b66ea312/video-call	t	2026-03-26 13:11:11.786189
9af961b4-2d1c-4177-b7cb-bcceeae23541	b63f19d3-6b6a-4959-ac1c-a9cb793feb7c	video_call_started	Video Call Started	Abdul Razzaq Ansari started a video call in Elevare	/en/groups/d26bbaa0-5038-41ed-9437-87a7b66ea312/video-call	f	2026-03-27 07:56:05.287232
b522cfb4-46ad-4bcd-872e-79a06d715142	85e03b40-d245-4589-b936-a7378796ad34	video_call_started	Video Call Started	Abdul Razzaq Ansari started a video call in Elevare	/en/groups/d26bbaa0-5038-41ed-9437-87a7b66ea312/video-call	f	2026-03-27 07:56:05.290036
03507f98-1e60-49ff-abd2-5cb319139d93	f810b345-d156-4d69-9cb9-486492218e7d	video_call_started	Video Call Started	Abdul Razzaq Ansari started a video call in Elevare	/en/groups/d26bbaa0-5038-41ed-9437-87a7b66ea312/video-call	f	2026-03-27 07:56:05.293759
be26760b-d82d-4339-a9b0-4dc6fc9e6638	a728c824-0f73-4fa3-8296-78dfd82d325f	video_call_started	Video Call Started	Abdul Razzaq Ansari started a video call in Elevare	/en/groups/d26bbaa0-5038-41ed-9437-87a7b66ea312/video-call	f	2026-03-27 07:56:05.297018
6f7fa197-5bbe-4ecc-9011-28d042612d7a	67b9ed97-23a9-4c1b-9e9f-9e88cc3c017f	video_call_started	Video Call Started	Abdul Razzaq Ansari started a video call in Elevare	/en/groups/d26bbaa0-5038-41ed-9437-87a7b66ea312/video-call	f	2026-03-27 07:56:05.299589
6bf6fb43-b3b0-4a0a-a3a2-4dc447f5ba4f	a3a3670c-0e72-4a7a-b21c-259ea751ec59	join_request_received	New Join Request	Rijan Karki has requested to join "Elevare".	/en/groups/d26bbaa0-5038-41ed-9437-87a7b66ea312	f	2026-03-27 08:46:46.624081
b8bbe336-cbb1-441b-bea6-b4d60bc56947	f794fc40-a7bd-4c57-8159-4e6704d79586	join_request_approved	Join Request Approved	Your request to join "Elevare" has been approved. Welcome to the group!	/en/groups/d26bbaa0-5038-41ed-9437-87a7b66ea312	f	2026-03-27 08:47:43.560166
d9c2c6ca-2fdc-4064-b4b8-b282b2d61f54	b63f19d3-6b6a-4959-ac1c-a9cb793feb7c	video_call_started	Video Call Started	Abdul Razzaq Ansari started a video call in Elevare	/en/groups/d26bbaa0-5038-41ed-9437-87a7b66ea312/video-call	f	2026-03-27 08:48:06.650338
0739b7ce-2182-4d40-855a-f2113866a767	85e03b40-d245-4589-b936-a7378796ad34	video_call_started	Video Call Started	Abdul Razzaq Ansari started a video call in Elevare	/en/groups/d26bbaa0-5038-41ed-9437-87a7b66ea312/video-call	f	2026-03-27 08:48:06.652936
7e8f0f4d-32af-4501-84f4-ea870b32dce4	f810b345-d156-4d69-9cb9-486492218e7d	video_call_started	Video Call Started	Abdul Razzaq Ansari started a video call in Elevare	/en/groups/d26bbaa0-5038-41ed-9437-87a7b66ea312/video-call	f	2026-03-27 08:48:06.65522
c8beb43c-7e30-4be9-bb18-2a730acf2e08	a728c824-0f73-4fa3-8296-78dfd82d325f	video_call_started	Video Call Started	Abdul Razzaq Ansari started a video call in Elevare	/en/groups/d26bbaa0-5038-41ed-9437-87a7b66ea312/video-call	f	2026-03-27 08:48:06.657632
28947e14-3875-41e1-b280-3ab8ebab0d42	67b9ed97-23a9-4c1b-9e9f-9e88cc3c017f	video_call_started	Video Call Started	Abdul Razzaq Ansari started a video call in Elevare	/en/groups/d26bbaa0-5038-41ed-9437-87a7b66ea312/video-call	f	2026-03-27 08:48:06.659761
72babded-2a14-4f77-bdce-fe980e392c60	f794fc40-a7bd-4c57-8159-4e6704d79586	video_call_started	Video Call Started	Abdul Razzaq Ansari started a video call in Elevare	/en/groups/d26bbaa0-5038-41ed-9437-87a7b66ea312/video-call	t	2026-03-27 08:48:06.661785
bf4fdeff-9548-4c5a-960b-fb49ae250075	a3a3670c-0e72-4a7a-b21c-259ea751ec59	task_deadline	Task Deadline Approaching	Your task "Go for a hike" is due in 24 hours.	/en/tasks/1333c142-e1ff-435c-a242-ffa8dc9733c5	f	2026-03-27 18:15:13.13858
0df68a4e-7c4f-4374-aa77-302fba656fe7	a3a3670c-0e72-4a7a-b21c-259ea751ec59	task_deadline	Task Deadline Approaching	Your task "Go for a hike" is due in 12 hours.	/en/tasks/1333c142-e1ff-435c-a242-ffa8dc9733c5	f	2026-03-28 06:15:13.184723
\.


--
-- Data for Name: password_reset_tokens; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.password_reset_tokens (id, user_id, token, expires_at, created_at) FROM stdin;
\.


--
-- Data for Name: privacy_impact_assessments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.privacy_impact_assessments (id, assessment_type, data_categories, processing_purposes, legal_basis, risk_level, mitigation_measures, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: resource_comments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.resource_comments (id, resource_id, user_id, content, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: resource_ratings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.resource_ratings (id, resource_id, user_id, rating, created_at) FROM stdin;
\.


--
-- Data for Name: resources; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.resources (id, user_id, title, description, file_url, file_type, file_size, tags, download_count, average_rating, created_at, updated_at, file_name) FROM stdin;
\.


--
-- Data for Name: security_events; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.security_events (id, event_type, severity, source_ip, user_agent, admin_id, details, resolved, resolved_by, resolved_at, created_at) FROM stdin;
d20bbc4e-b4b1-46eb-af5b-710b8434b543	failed_login	medium	10.20.219.2	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0.1 Safari/605.1.15	\N	{"email": "admin@elevare.com", "reason": "user_not_found"}	f	\N	\N	2026-03-27 07:29:27.914437
28651e64-63e3-4860-adc7-e3141beb5aef	failed_login	medium	10.21.166.129	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0.1 Safari/605.1.15	\N	{"email": "adminaccount@elevare.com", "reason": "user_not_found"}	f	\N	\N	2026-03-29 02:27:31.338099
\.


--
-- Data for Name: security_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.security_logs (id, type, severity, user_id, ip_address, user_agent, details, created_at) FROM stdin;
\.


--
-- Data for Name: study_groups; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.study_groups (id, name, description, owner_id, is_private, max_members, created_at, updated_at, tags) FROM stdin;
d26bbaa0-5038-41ed-9437-87a7b66ea312	Elevare	This is the group to test all features	a3a3670c-0e72-4a7a-b21c-259ea751ec59	f	13	2026-03-07 14:15:05.761434	2026-03-07 14:15:05.761434	{}
\.


--
-- Data for Name: suspension_appeals; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.suspension_appeals (id, user_id, suspension_id, appeal_message, status, admin_response, reviewed_by, reviewed_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: system_config; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.system_config (id, key, value, description, category, updated_by, updated_at) FROM stdin;
\.


--
-- Data for Name: task_categories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.task_categories (id, user_id, name, color, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: tasks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tasks (id, user_id, title, description, due_date, priority, status, category_id, completed_at, created_at, updated_at, tags, sort_order) FROM stdin;
ab4f79eb-2c11-40a4-ba4c-c23975fdb81e	a3a3670c-0e72-4a7a-b21c-259ea751ec59	Test	This is a test task	2026-03-16 18:15:00	high	completed	\N	2026-03-08 05:55:43.467987	2026-03-06 21:07:51.244354	2026-03-26 15:15:04.174955	{Test}	0
1333c142-e1ff-435c-a242-ffa8dc9733c5	a3a3670c-0e72-4a7a-b21c-259ea751ec59	Go for a hike	The goal is to go for a hike to Danabari and return by 4 hours I.e. before 10 am.	2026-03-28 18:15:00	medium	pending	\N	\N	2026-03-27 15:07:00.131241	2026-03-27 15:07:00.131241	{Hike,Personal}	0
\.


--
-- Data for Name: user_suspensions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_suspensions (id, user_id, suspended_by, reason, suspension_type, starts_at, expires_at, is_active, lifted_by, lifted_at, lift_reason, created_at) FROM stdin;
\.


--
-- Data for Name: user_violations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_violations (id, user_id, violation_type, severity, description, moderator_id, abuse_report_id, action_taken, duration_hours, expires_at, created_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, email, password_hash, name, bio, avatar_url, email_verified, created_at, updated_at, preferred_language, account_type, last_login, account_status, timezone, phone, date_of_birth, institution, gender, age, otp_code, otp_expires_at, otp_attempts, university, major, graduation_date, oauth_provider, oauth_id, oauth_profile, walkthrough_completed) FROM stdin;
ed2dba75-9f0f-43c7-9c54-a23005152262	newuser@example.com	$2a$10$JIGaykxvXMp7k0haNHreK.beEl7A723wk4tiMuoApl.QClMeVtnAa	New User	\N	\N	f	2026-03-06 19:16:51.214127	2026-03-06 19:16:51.214127	en	student	\N	active	UTC	\N	\N	\N	\N	\N	814975	2026-03-06 19:26:51.21	0	\N	\N	\N	\N	\N	\N	f
f4ea6d8e-1207-4b46-9355-37dd4ebf5edf	newuser11@example.com	$2a$10$a0opKUn/UgZyKoiWGXhwZ.3JBEP6a9.SmaX77Ykm1GrgStQuH2/66	New User	\N	\N	f	2026-03-06 19:17:15.113875	2026-03-06 19:17:15.113875	en	student	\N	active	UTC	\N	\N	\N	\N	\N	425977	2026-03-06 19:27:15.115	0	\N	\N	\N	\N	\N	\N	f
51885cba-45fb-427d-a572-d234f8ca5dec	razzaqansari24@gmail.com	$2a$10$aWCWt3zy6i3zmI7xICMDwuYe1K.bINitl6mt.yH2o60PSX2u1yXna	Rajak Ansari	\N	\N	f	2026-03-06 19:19:20.384363	2026-03-06 19:19:20.384363	en	student	\N	active	UTC	\N	\N	\N	\N	\N	295911	2026-03-06 19:29:20.383	0	\N	\N	\N	\N	\N	\N	f
19814aad-4a7e-456f-b3e6-23822f084a15	kiro35127@gmail.com	$2a$10$AmZKdE5wc9cdYgrbxCNHUeN.L74LKP3hFB3L0uNrn5nPb4v3NALpS	Kiro	\N	\N	f	2026-03-06 19:20:23.980928	2026-03-06 19:20:23.980928	en	student	\N	active	UTC	\N	\N	\N	\N	\N	872777	2026-03-06 19:30:23.98	0	\N	\N	\N	\N	\N	\N	f
3cec705c-c1ce-4a5b-b5ae-d7087cd65e4a	shabnamcollection257@gmail.com	$2a$10$9MMERL5mwvInfiJqCaUajOatA.jxuUufdBqGYeihBR1/HSc/UkfCS	Shabnam	\N	\N	f	2026-03-06 19:25:59.300241	2026-03-06 19:25:59.300241	en	student	\N	active	UTC	\N	\N	\N	\N	\N	103935	2026-03-06 19:35:59.302	0	\N	\N	\N	\N	\N	\N	f
d9327fda-6847-41bf-91f6-db4a6f2ea78d	np05cp4a230197@iic.edu.np	$2a$10$hDuKbIHKzeE5gt2hfgPmle8hzoihmSfRYV6t60tCZASerVvacakTK	Krish Adhikari	\N	\N	f	2026-03-25 16:06:18.721176	2026-03-25 16:06:18.721176	en	student	\N	active	UTC	\N	\N	\N	\N	\N	561858	2026-03-25 16:16:18.72	0	\N	\N	\N	\N	\N	\N	f
fd7d1c0e-4309-4b8b-989a-0db62b8347aa	anythinganywhere8810@gmail.com	$2a$10$i5f18XAlwygwsBz9y2f20eDXkzgWwXOq57JxrtC2C5JYS9wjELJGm	Anyone	\N	\N	f	2026-03-06 20:52:13.880268	2026-03-07 02:05:06.982279	en	student	\N	active	UTC	\N	\N	\N	\N	\N	583223	2026-03-07 02:15:06.989	0	\N	\N	\N	\N	\N	\N	f
6b5c4110-4c6e-4bdb-9be3-0cf450c3a24f	np05cp4a220090@iic.edu.np	$2a$10$WaSYxAXDj0p7XicNc/TVHOHxUNavtcWFie0yLW4lOsf4CMEwalgZK	Preyanshu Shah	\N	/uploads/avatars/avatar-1943987f-c954-449a-911f-13c14a5317a5.jpeg	t	2026-03-12 14:59:53.766627	2026-03-12 15:03:38.139024	en	student	\N	active	UTC	\N	2003-08-30	Itahari International College	male	22	\N	\N	0	Itahari International College	BSc Hons in Computing	2025-12-17	\N	\N	\N	f
f810b345-d156-4d69-9cb9-486492218e7d	saphalchudal29@gmail.com	$2a$10$8bGk0oD.FYf50gEPWDk6iuko2nukoVq9H/RRJ5QPtzET18VaqgITe	SAPHAL CHUDAL	\N	https://lh3.googleusercontent.com/a/ACg8ocL4rb8j-p_LsoRTNx_nD0boVCr0YpXRD-7gkLGNzMu1L2W5onG1=s96-c	t	2026-03-25 16:01:08.81798	2026-03-28 23:44:26.837627	en	student	2026-03-28 23:44:26.837627	active	UTC	\N	\N	\N	\N	\N	110045	2026-03-25 16:11:08.813	0	\N	\N	\N	google	118155470108907197029	{"id": "118155470108907197029", "_raw": "{\\n  \\"sub\\": \\"118155470108907197029\\",\\n  \\"name\\": \\"SAPHAL CHUDAL\\",\\n  \\"given_name\\": \\"SAPHAL\\",\\n  \\"family_name\\": \\"CHUDAL\\",\\n  \\"picture\\": \\"https://lh3.googleusercontent.com/a/ACg8ocL4rb8j-p_LsoRTNx_nD0boVCr0YpXRD-7gkLGNzMu1L2W5onG1\\\\u003ds96-c\\",\\n  \\"email\\": \\"saphalchudal29@gmail.com\\",\\n  \\"email_verified\\": true\\n}", "name": {"givenName": "SAPHAL", "familyName": "CHUDAL"}, "_json": {"sub": "118155470108907197029", "name": "SAPHAL CHUDAL", "email": "saphalchudal29@gmail.com", "picture": "https://lh3.googleusercontent.com/a/ACg8ocL4rb8j-p_LsoRTNx_nD0boVCr0YpXRD-7gkLGNzMu1L2W5onG1=s96-c", "given_name": "SAPHAL", "family_name": "CHUDAL", "email_verified": true}, "emails": [{"value": "saphalchudal29@gmail.com", "verified": true}], "photos": [{"value": "https://lh3.googleusercontent.com/a/ACg8ocL4rb8j-p_LsoRTNx_nD0boVCr0YpXRD-7gkLGNzMu1L2W5onG1=s96-c"}], "provider": "google", "displayName": "SAPHAL CHUDAL"}	t
f529154b-2528-4eb0-ac67-2601a7e1fbf8	np05cp4a230205@iic.edu.np	$2a$10$V62yuYHwDBkuKiIfejQAPeeXCI4DzCXvLByzYstUk/FIWJogE6rvm	Saphal	\N	\N	f	2026-03-25 16:02:28.016447	2026-03-25 16:02:28.016447	en	student	\N	active	UTC	\N	\N	\N	\N	\N	758156	2026-03-25 16:12:28.015	0	\N	\N	\N	\N	\N	\N	f
b63f19d3-6b6a-4959-ac1c-a9cb793feb7c	np05cp4a230196@iic.edu.np	$2a$10$ycrbtJzl2vq329XU/0dR8eqx6T7QIkBb7SSIHEakfSJhxJjAkgiKW	Elevare	\N	\N	t	2026-03-07 03:08:26.87125	2026-03-26 02:47:24.619136	en	student	\N	active	UTC	\N	\N	\N	\N	\N	\N	\N	0	\N	\N	\N	\N	\N	\N	t
85e03b40-d245-4589-b936-a7378796ad34	rajakansari959@gmail.com	$2a$10$g2SKxsR/AtPJ1vF7HKFKVu29xyLzM08S3fj.s2ZgdAGPu8S9CLFvq	Rajak Ansari	\N	https://lh3.googleusercontent.com/a/ACg8ocJPdqWS3cdLoOOJ-TUfuzRq3UxD5XhsRTeUDCICkmv9JVttLHU=s96-c	t	2026-03-25 16:03:53.513423	2026-03-26 11:38:06.520731	en	student	2026-03-26 11:38:06.520731	active	UTC	\N	\N	\N	\N	\N	142607	2026-03-25 16:13:53.512	0	\N	\N	\N	google	100231613004480226187	{"id": "100231613004480226187", "_raw": "{\\n  \\"sub\\": \\"100231613004480226187\\",\\n  \\"name\\": \\"Rajak Ansari\\",\\n  \\"given_name\\": \\"Rajak\\",\\n  \\"family_name\\": \\"Ansari\\",\\n  \\"picture\\": \\"https://lh3.googleusercontent.com/a/ACg8ocJPdqWS3cdLoOOJ-TUfuzRq3UxD5XhsRTeUDCICkmv9JVttLHU\\\\u003ds96-c\\",\\n  \\"email\\": \\"rajakansari959@gmail.com\\",\\n  \\"email_verified\\": true\\n}", "name": {"givenName": "Rajak", "familyName": "Ansari"}, "_json": {"sub": "100231613004480226187", "name": "Rajak Ansari", "email": "rajakansari959@gmail.com", "picture": "https://lh3.googleusercontent.com/a/ACg8ocJPdqWS3cdLoOOJ-TUfuzRq3UxD5XhsRTeUDCICkmv9JVttLHU=s96-c", "given_name": "Rajak", "family_name": "Ansari", "email_verified": true}, "emails": [{"value": "rajakansari959@gmail.com", "verified": true}], "photos": [{"value": "https://lh3.googleusercontent.com/a/ACg8ocJPdqWS3cdLoOOJ-TUfuzRq3UxD5XhsRTeUDCICkmv9JVttLHU=s96-c"}], "provider": "google", "displayName": "Rajak Ansari"}	f
a3a3670c-0e72-4a7a-b21c-259ea751ec59	rajak000024@gmail.com	$2a$10$Yw7c1l3NgO9VJPUcFaXjFO9MnpTowa0643aNyxC132B6u5KZS2s/.	Abdul Razzaq Ansari	I am a student	/uploads/avatars/avatar-eef725cf-7000-4788-ae2b-8c3fcdb87cd8.jpeg	t	2026-03-06 20:30:36.393258	2026-03-27 15:10:38.794645	en	student	\N	active	UTC	+977 9827310498	2005-01-24	IT	male	21	899152	2026-03-06 20:57:58.316	0	London Metropolitian University	Computing	2026-12-13	\N	\N	\N	t
a728c824-0f73-4fa3-8296-78dfd82d325f	obitothapa2061@gmail.com	\N	Rinobito	\N	https://lh3.googleusercontent.com/a/ACg8ocIrePZo8XY4jg_SVIefpAtZd9VihvmRlx0dbSh4CHTYV_y66RA=s96-c	t	2026-03-26 11:44:13.790808	2026-03-26 11:44:39.107273	en	student	2026-03-26 11:44:32.24086	active	UTC	\N	\N	\N	\N	\N	\N	\N	0	\N	\N	\N	google	110301519079335134166	{"id": "110301519079335134166", "_raw": "{\\n  \\"sub\\": \\"110301519079335134166\\",\\n  \\"name\\": \\"Rinobito\\",\\n  \\"given_name\\": \\"Rinobito\\",\\n  \\"picture\\": \\"https://lh3.googleusercontent.com/a/ACg8ocIrePZo8XY4jg_SVIefpAtZd9VihvmRlx0dbSh4CHTYV_y66RA\\\\u003ds96-c\\",\\n  \\"email\\": \\"obitothapa2061@gmail.com\\",\\n  \\"email_verified\\": true\\n}", "name": {"givenName": "Rinobito"}, "_json": {"sub": "110301519079335134166", "name": "Rinobito", "email": "obitothapa2061@gmail.com", "picture": "https://lh3.googleusercontent.com/a/ACg8ocIrePZo8XY4jg_SVIefpAtZd9VihvmRlx0dbSh4CHTYV_y66RA=s96-c", "given_name": "Rinobito", "email_verified": true}, "emails": [{"value": "obitothapa2061@gmail.com", "verified": true}], "photos": [{"value": "https://lh3.googleusercontent.com/a/ACg8ocIrePZo8XY4jg_SVIefpAtZd9VihvmRlx0dbSh4CHTYV_y66RA=s96-c"}], "provider": "google", "displayName": "Rinobito"}	t
67b9ed97-23a9-4c1b-9e9f-9e88cc3c017f	preyanshushah@gmail.com	\N	Preyanshu Shah	\N	https://lh3.googleusercontent.com/a/ACg8ocKLpSNpIcRpl1SC_IAZuGU96uh4dKS3ML8v11XDbyv5fGKDNnnaLQ=s96-c	t	2026-03-26 13:10:04.354986	2026-03-26 13:10:35.749591	en	student	2026-03-26 13:10:28.791076	active	UTC	\N	\N	\N	\N	\N	\N	\N	0	\N	\N	\N	google	116394136718217222881	{"id": "116394136718217222881", "_raw": "{\\n  \\"sub\\": \\"116394136718217222881\\",\\n  \\"name\\": \\"Preyanshu Shah\\",\\n  \\"given_name\\": \\"Preyanshu\\",\\n  \\"family_name\\": \\"Shah\\",\\n  \\"picture\\": \\"https://lh3.googleusercontent.com/a/ACg8ocKLpSNpIcRpl1SC_IAZuGU96uh4dKS3ML8v11XDbyv5fGKDNnnaLQ\\\\u003ds96-c\\",\\n  \\"email\\": \\"preyanshushah@gmail.com\\",\\n  \\"email_verified\\": true\\n}", "name": {"givenName": "Preyanshu", "familyName": "Shah"}, "_json": {"sub": "116394136718217222881", "name": "Preyanshu Shah", "email": "preyanshushah@gmail.com", "picture": "https://lh3.googleusercontent.com/a/ACg8ocKLpSNpIcRpl1SC_IAZuGU96uh4dKS3ML8v11XDbyv5fGKDNnnaLQ=s96-c", "given_name": "Preyanshu", "family_name": "Shah", "email_verified": true}, "emails": [{"value": "preyanshushah@gmail.com", "verified": true}], "photos": [{"value": "https://lh3.googleusercontent.com/a/ACg8ocKLpSNpIcRpl1SC_IAZuGU96uh4dKS3ML8v11XDbyv5fGKDNnnaLQ=s96-c"}], "provider": "google", "displayName": "Preyanshu Shah"}	t
ed662557-88c1-4480-8c37-a89c372fb4ca	rajakansari833@gmail.com	$2a$10$1T7UMkpjn4jBgiE8UGpK2etfhyUjzez1qrTh0hiAWfllrCQd/U/p2	Rajak Ansari	\N	https://lh3.googleusercontent.com/a/ACg8ocII2AHiHS-C49hl_XUQlgmCnmxDVejILE93OkaOEoRcJcc9rQ=s96-c	t	2026-03-26 02:39:27.311975	2026-03-26 15:15:36.443975	en	student	2026-03-26 15:15:36.443975	active	UTC	\N	\N	\N	\N	\N	328498	2026-03-26 02:49:27.311	0	\N	\N	\N	google	100440704541693454819	{"id": "100440704541693454819", "_raw": "{\\n  \\"sub\\": \\"100440704541693454819\\",\\n  \\"name\\": \\"Inaz\\",\\n  \\"given_name\\": \\"Inaz\\",\\n  \\"picture\\": \\"https://lh3.googleusercontent.com/a/ACg8ocII2AHiHS-C49hl_XUQlgmCnmxDVejILE93OkaOEoRcJcc9rQ\\\\u003ds96-c\\",\\n  \\"email\\": \\"rajakansari833@gmail.com\\",\\n  \\"email_verified\\": true\\n}", "name": {"givenName": "Inaz"}, "_json": {"sub": "100440704541693454819", "name": "Inaz", "email": "rajakansari833@gmail.com", "picture": "https://lh3.googleusercontent.com/a/ACg8ocII2AHiHS-C49hl_XUQlgmCnmxDVejILE93OkaOEoRcJcc9rQ=s96-c", "given_name": "Inaz", "email_verified": true}, "emails": [{"value": "rajakansari833@gmail.com", "verified": true}], "photos": [{"value": "https://lh3.googleusercontent.com/a/ACg8ocII2AHiHS-C49hl_XUQlgmCnmxDVejILE93OkaOEoRcJcc9rQ=s96-c"}], "provider": "google", "displayName": "Inaz"}	f
f794fc40-a7bd-4c57-8159-4e6704d79586	ukgamer2468@gmail.com	$2a$10$KPMeWC2riWUs48ZCVKAIBO/ks.cT/RpvQMWiC.XI0CzLBHefs1MNa	Rijan Karki	\N	https://lh3.googleusercontent.com/a/ACg8ocJJ_zBeDNfSEAMTFg2lds1TvWAMSYEfAhvIyZ1cKcDT6VPziA=s96-c	t	2026-03-27 08:40:46.723332	2026-03-27 08:45:05.015121	en	student	2026-03-27 08:44:31.616814	active	UTC	\N	\N	\N	\N	\N	637588	2026-03-27 08:53:49.261	0	\N	\N	\N	google	107484283676478521255	{"id": "107484283676478521255", "_raw": "{\\n  \\"sub\\": \\"107484283676478521255\\",\\n  \\"name\\": \\"Unknown Gamer\\",\\n  \\"given_name\\": \\"Unknown\\",\\n  \\"family_name\\": \\"Gamer\\",\\n  \\"picture\\": \\"https://lh3.googleusercontent.com/a/ACg8ocJJ_zBeDNfSEAMTFg2lds1TvWAMSYEfAhvIyZ1cKcDT6VPziA\\\\u003ds96-c\\",\\n  \\"email\\": \\"ukgamer2468@gmail.com\\",\\n  \\"email_verified\\": true\\n}", "name": {"givenName": "Unknown", "familyName": "Gamer"}, "_json": {"sub": "107484283676478521255", "name": "Unknown Gamer", "email": "ukgamer2468@gmail.com", "picture": "https://lh3.googleusercontent.com/a/ACg8ocJJ_zBeDNfSEAMTFg2lds1TvWAMSYEfAhvIyZ1cKcDT6VPziA=s96-c", "given_name": "Unknown", "family_name": "Gamer", "email_verified": true}, "emails": [{"value": "ukgamer2468@gmail.com", "verified": true}], "photos": [{"value": "https://lh3.googleusercontent.com/a/ACg8ocJJ_zBeDNfSEAMTFg2lds1TvWAMSYEfAhvIyZ1cKcDT6VPziA=s96-c"}], "provider": "google", "displayName": "Unknown Gamer"}	t
\.


--
-- Data for Name: whiteboard_elements; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.whiteboard_elements (id, whiteboard_id, element_type, element_data, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: whiteboard_versions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.whiteboard_versions (id, whiteboard_id, canvas_data, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: whiteboards; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.whiteboards (id, group_id, user_id, name, canvas_data, created_at, updated_at) FROM stdin;
1a835245-8fce-4653-9997-ef71779ce640	d26bbaa0-5038-41ed-9437-87a7b66ea312	a3a3670c-0e72-4a7a-b21c-259ea751ec59	Coursework Idea 	{"version": 1, "elements": [], "background": "#ffffff"}	2026-03-27 15:14:26.988791	2026-03-27 15:14:26.988791
\.


--
-- Name: abuse_reports abuse_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.abuse_reports
    ADD CONSTRAINT abuse_reports_pkey PRIMARY KEY (id);


--
-- Name: admin_notifications admin_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_notifications
    ADD CONSTRAINT admin_notifications_pkey PRIMARY KEY (id);


--
-- Name: admin_sessions admin_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_sessions
    ADD CONSTRAINT admin_sessions_pkey PRIMARY KEY (id);


--
-- Name: admin_sessions admin_sessions_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_sessions
    ADD CONSTRAINT admin_sessions_token_hash_key UNIQUE (token_hash);


--
-- Name: admin_users admin_users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_email_key UNIQUE (email);


--
-- Name: admin_users admin_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: backup_restorations backup_restorations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.backup_restorations
    ADD CONSTRAINT backup_restorations_pkey PRIMARY KEY (id);


--
-- Name: compliance_reports compliance_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_reports
    ADD CONSTRAINT compliance_reports_pkey PRIMARY KEY (id);


--
-- Name: dashboard_preferences dashboard_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dashboard_preferences
    ADD CONSTRAINT dashboard_preferences_pkey PRIMARY KEY (id);


--
-- Name: dashboard_preferences dashboard_preferences_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dashboard_preferences
    ADD CONSTRAINT dashboard_preferences_user_id_key UNIQUE (user_id);


--
-- Name: data_retention_policies data_retention_policies_entity_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_retention_policies
    ADD CONSTRAINT data_retention_policies_entity_type_key UNIQUE (entity_type);


--
-- Name: data_retention_policies data_retention_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_retention_policies
    ADD CONSTRAINT data_retention_policies_pkey PRIMARY KEY (id);


--
-- Name: emergency_lockdowns emergency_lockdowns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emergency_lockdowns
    ADD CONSTRAINT emergency_lockdowns_pkey PRIMARY KEY (id);


--
-- Name: external_auditor_access external_auditor_access_access_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_auditor_access
    ADD CONSTRAINT external_auditor_access_access_token_hash_key UNIQUE (access_token_hash);


--
-- Name: external_auditor_access external_auditor_access_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_auditor_access
    ADD CONSTRAINT external_auditor_access_pkey PRIMARY KEY (id);


--
-- Name: feature_flags feature_flags_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_flags
    ADD CONSTRAINT feature_flags_name_key UNIQUE (name);


--
-- Name: feature_flags feature_flags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_flags
    ADD CONSTRAINT feature_flags_pkey PRIMARY KEY (id);


--
-- Name: file_access_logs file_access_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.file_access_logs
    ADD CONSTRAINT file_access_logs_pkey PRIMARY KEY (id);


--
-- Name: file_folders file_folders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.file_folders
    ADD CONSTRAINT file_folders_pkey PRIMARY KEY (id);


--
-- Name: file_shares file_shares_file_id_shared_with_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.file_shares
    ADD CONSTRAINT file_shares_file_id_shared_with_user_id_key UNIQUE (file_id, shared_with_user_id);


--
-- Name: file_shares file_shares_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.file_shares
    ADD CONSTRAINT file_shares_pkey PRIMARY KEY (id);


--
-- Name: files files_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT files_pkey PRIMARY KEY (id);


--
-- Name: gdpr_deletion_requests gdpr_deletion_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gdpr_deletion_requests
    ADD CONSTRAINT gdpr_deletion_requests_pkey PRIMARY KEY (id);


--
-- Name: gdpr_export_requests gdpr_export_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gdpr_export_requests
    ADD CONSTRAINT gdpr_export_requests_pkey PRIMARY KEY (id);


--
-- Name: group_join_requests group_join_requests_group_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_join_requests
    ADD CONSTRAINT group_join_requests_group_id_user_id_key UNIQUE (group_id, user_id);


--
-- Name: group_join_requests group_join_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_join_requests
    ADD CONSTRAINT group_join_requests_pkey PRIMARY KEY (id);


--
-- Name: group_members group_members_group_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_members
    ADD CONSTRAINT group_members_group_id_user_id_key UNIQUE (group_id, user_id);


--
-- Name: group_members group_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_members
    ADD CONSTRAINT group_members_pkey PRIMARY KEY (id);


--
-- Name: group_messages group_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_messages
    ADD CONSTRAINT group_messages_pkey PRIMARY KEY (id);


--
-- Name: group_resources group_resources_group_id_resource_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_resources
    ADD CONSTRAINT group_resources_group_id_resource_id_key UNIQUE (group_id, resource_id);


--
-- Name: group_resources group_resources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_resources
    ADD CONSTRAINT group_resources_pkey PRIMARY KEY (id);


--
-- Name: incident_reports incident_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incident_reports
    ADD CONSTRAINT incident_reports_pkey PRIMARY KEY (id);


--
-- Name: moderation_actions moderation_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moderation_actions
    ADD CONSTRAINT moderation_actions_pkey PRIMARY KEY (id);


--
-- Name: note_folders note_folders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.note_folders
    ADD CONSTRAINT note_folders_pkey PRIMARY KEY (id);


--
-- Name: notes notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_pkey PRIMARY KEY (id);


--
-- Name: notification_preferences notification_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_pkey PRIMARY KEY (id);


--
-- Name: notification_preferences notification_preferences_user_id_notification_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_user_id_notification_type_key UNIQUE (user_id, notification_type);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key UNIQUE (token);


--
-- Name: password_reset_tokens password_reset_tokens_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_key UNIQUE (user_id);


--
-- Name: privacy_impact_assessments privacy_impact_assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.privacy_impact_assessments
    ADD CONSTRAINT privacy_impact_assessments_pkey PRIMARY KEY (id);


--
-- Name: resource_comments resource_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resource_comments
    ADD CONSTRAINT resource_comments_pkey PRIMARY KEY (id);


--
-- Name: resource_ratings resource_ratings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resource_ratings
    ADD CONSTRAINT resource_ratings_pkey PRIMARY KEY (id);


--
-- Name: resource_ratings resource_ratings_resource_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resource_ratings
    ADD CONSTRAINT resource_ratings_resource_id_user_id_key UNIQUE (resource_id, user_id);


--
-- Name: resources resources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resources
    ADD CONSTRAINT resources_pkey PRIMARY KEY (id);


--
-- Name: security_events security_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_events
    ADD CONSTRAINT security_events_pkey PRIMARY KEY (id);


--
-- Name: security_logs security_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_logs
    ADD CONSTRAINT security_logs_pkey PRIMARY KEY (id);


--
-- Name: study_groups study_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_groups
    ADD CONSTRAINT study_groups_pkey PRIMARY KEY (id);


--
-- Name: suspension_appeals suspension_appeals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suspension_appeals
    ADD CONSTRAINT suspension_appeals_pkey PRIMARY KEY (id);


--
-- Name: system_config system_config_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_config
    ADD CONSTRAINT system_config_key_key UNIQUE (key);


--
-- Name: system_config system_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_config
    ADD CONSTRAINT system_config_pkey PRIMARY KEY (id);


--
-- Name: task_categories task_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_categories
    ADD CONSTRAINT task_categories_pkey PRIMARY KEY (id);


--
-- Name: task_categories task_categories_user_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_categories
    ADD CONSTRAINT task_categories_user_id_name_key UNIQUE (user_id, name);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: user_suspensions user_suspensions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_suspensions
    ADD CONSTRAINT user_suspensions_pkey PRIMARY KEY (id);


--
-- Name: user_violations user_violations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_violations
    ADD CONSTRAINT user_violations_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: whiteboard_elements whiteboard_elements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whiteboard_elements
    ADD CONSTRAINT whiteboard_elements_pkey PRIMARY KEY (id);


--
-- Name: whiteboard_versions whiteboard_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whiteboard_versions
    ADD CONSTRAINT whiteboard_versions_pkey PRIMARY KEY (id);


--
-- Name: whiteboards whiteboards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whiteboards
    ADD CONSTRAINT whiteboards_pkey PRIMARY KEY (id);


--
-- Name: idx_abuse_reports_content_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_abuse_reports_content_type ON public.abuse_reports USING btree (content_type);


--
-- Name: idx_abuse_reports_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_abuse_reports_created_at ON public.abuse_reports USING btree (created_at DESC);


--
-- Name: idx_abuse_reports_moderator_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_abuse_reports_moderator_id ON public.abuse_reports USING btree (moderator_id);


--
-- Name: idx_abuse_reports_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_abuse_reports_priority ON public.abuse_reports USING btree (priority);


--
-- Name: idx_abuse_reports_reported_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_abuse_reports_reported_user_id ON public.abuse_reports USING btree (reported_user_id);


--
-- Name: idx_abuse_reports_reporter_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_abuse_reports_reporter_id ON public.abuse_reports USING btree (reporter_id);


--
-- Name: idx_abuse_reports_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_abuse_reports_status ON public.abuse_reports USING btree (status);


--
-- Name: idx_admin_notifications_admin_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_notifications_admin_id ON public.admin_notifications USING btree (admin_id);


--
-- Name: idx_admin_notifications_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_notifications_created_at ON public.admin_notifications USING btree (created_at DESC);


--
-- Name: idx_admin_notifications_read; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_notifications_read ON public.admin_notifications USING btree (read);


--
-- Name: idx_admin_notifications_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_notifications_type ON public.admin_notifications USING btree (type);


--
-- Name: idx_admin_sessions_active_admin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_sessions_active_admin ON public.admin_sessions USING btree (is_admin, expires_at) WHERE (is_admin = true);


--
-- Name: idx_admin_sessions_admin_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_sessions_admin_id ON public.admin_sessions USING btree (admin_id);


--
-- Name: idx_admin_sessions_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_sessions_expires_at ON public.admin_sessions USING btree (expires_at);


--
-- Name: idx_admin_sessions_ip_address; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_sessions_ip_address ON public.admin_sessions USING btree (ip_address);


--
-- Name: idx_admin_sessions_is_admin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_sessions_is_admin ON public.admin_sessions USING btree (is_admin);


--
-- Name: idx_admin_sessions_last_activity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_sessions_last_activity ON public.admin_sessions USING btree (last_activity DESC);


--
-- Name: idx_admin_sessions_token_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_sessions_token_hash ON public.admin_sessions USING btree (token_hash);


--
-- Name: idx_admin_users_account_locked; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_users_account_locked ON public.admin_users USING btree (account_locked);


--
-- Name: idx_admin_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_users_email ON public.admin_users USING btree (email);


--
-- Name: idx_admin_users_mfa_enabled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_users_mfa_enabled ON public.admin_users USING btree (mfa_enabled);


--
-- Name: idx_admin_users_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_users_role ON public.admin_users USING btree (role);


--
-- Name: idx_audit_logs_action_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_action_type ON public.audit_logs USING btree (action_type);


--
-- Name: idx_audit_logs_admin_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_admin_id ON public.audit_logs USING btree (admin_id);


--
-- Name: idx_audit_logs_ip_address; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_ip_address ON public.audit_logs USING btree (ip_address);


--
-- Name: idx_audit_logs_target_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_target_entity ON public.audit_logs USING btree (target_entity);


--
-- Name: idx_audit_logs_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_timestamp ON public.audit_logs USING btree ("timestamp" DESC);


--
-- Name: idx_backup_restorations_backup_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_backup_restorations_backup_id ON public.backup_restorations USING btree (backup_id);


--
-- Name: idx_backup_restorations_initiated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_backup_restorations_initiated_at ON public.backup_restorations USING btree (initiated_at DESC);


--
-- Name: idx_backup_restorations_initiated_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_backup_restorations_initiated_by ON public.backup_restorations USING btree (initiated_by);


--
-- Name: idx_backup_restorations_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_backup_restorations_status ON public.backup_restorations USING btree (status);


--
-- Name: idx_compliance_reports_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_compliance_reports_expires_at ON public.compliance_reports USING btree (expires_at);


--
-- Name: idx_compliance_reports_generated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_compliance_reports_generated_at ON public.compliance_reports USING btree (generated_at DESC);


--
-- Name: idx_compliance_reports_generated_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_compliance_reports_generated_by ON public.compliance_reports USING btree (generated_by);


--
-- Name: idx_compliance_reports_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_compliance_reports_type ON public.compliance_reports USING btree (report_type);


--
-- Name: idx_dashboard_preferences_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dashboard_preferences_user_id ON public.dashboard_preferences USING btree (user_id);


--
-- Name: idx_data_retention_policies_auto_delete; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_data_retention_policies_auto_delete ON public.data_retention_policies USING btree (auto_delete);


--
-- Name: idx_data_retention_policies_entity_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_data_retention_policies_entity_type ON public.data_retention_policies USING btree (entity_type);


--
-- Name: idx_emergency_lockdowns_enabled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emergency_lockdowns_enabled ON public.emergency_lockdowns USING btree (enabled);


--
-- Name: idx_emergency_lockdowns_enabled_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emergency_lockdowns_enabled_at ON public.emergency_lockdowns USING btree (enabled_at DESC);


--
-- Name: idx_emergency_lockdowns_enabled_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emergency_lockdowns_enabled_by ON public.emergency_lockdowns USING btree (enabled_by);


--
-- Name: idx_emergency_lockdowns_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emergency_lockdowns_expires_at ON public.emergency_lockdowns USING btree (expires_at);


--
-- Name: idx_external_auditor_access_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_external_auditor_access_level ON public.external_auditor_access USING btree (access_level);


--
-- Name: idx_external_auditor_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_external_auditor_email ON public.external_auditor_access USING btree (auditor_email);


--
-- Name: idx_external_auditor_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_external_auditor_expires_at ON public.external_auditor_access USING btree (expires_at);


--
-- Name: idx_external_auditor_granted_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_external_auditor_granted_by ON public.external_auditor_access USING btree (granted_by);


--
-- Name: idx_external_auditor_revoked; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_external_auditor_revoked ON public.external_auditor_access USING btree (revoked);


--
-- Name: idx_external_auditor_token_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_external_auditor_token_hash ON public.external_auditor_access USING btree (access_token_hash);


--
-- Name: idx_feature_flags_enabled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feature_flags_enabled ON public.feature_flags USING btree (enabled);


--
-- Name: idx_feature_flags_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feature_flags_name ON public.feature_flags USING btree (name);


--
-- Name: idx_file_access_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_file_access_logs_created_at ON public.file_access_logs USING btree (created_at);


--
-- Name: idx_file_access_logs_file_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_file_access_logs_file_id ON public.file_access_logs USING btree (file_id);


--
-- Name: idx_file_folders_parent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_file_folders_parent_id ON public.file_folders USING btree (parent_id);


--
-- Name: idx_file_folders_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_file_folders_user_id ON public.file_folders USING btree (user_id);


--
-- Name: idx_file_shares_file_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_file_shares_file_id ON public.file_shares USING btree (file_id);


--
-- Name: idx_file_shares_shared_with_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_file_shares_shared_with_user_id ON public.file_shares USING btree (shared_with_user_id);


--
-- Name: idx_files_folder_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_files_folder_id ON public.files USING btree (folder_id);


--
-- Name: idx_files_tags; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_files_tags ON public.files USING gin (tags);


--
-- Name: idx_files_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_files_user_id ON public.files USING btree (user_id);


--
-- Name: idx_gdpr_deletion_requests_admin_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gdpr_deletion_requests_admin_id ON public.gdpr_deletion_requests USING btree (requested_by_admin);


--
-- Name: idx_gdpr_deletion_requests_requested_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gdpr_deletion_requests_requested_at ON public.gdpr_deletion_requests USING btree (requested_at DESC);


--
-- Name: idx_gdpr_deletion_requests_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gdpr_deletion_requests_status ON public.gdpr_deletion_requests USING btree (status);


--
-- Name: idx_gdpr_deletion_requests_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gdpr_deletion_requests_user_id ON public.gdpr_deletion_requests USING btree (user_id);


--
-- Name: idx_gdpr_export_requests_admin_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gdpr_export_requests_admin_id ON public.gdpr_export_requests USING btree (requested_by_admin);


--
-- Name: idx_gdpr_export_requests_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gdpr_export_requests_expires_at ON public.gdpr_export_requests USING btree (expires_at);


--
-- Name: idx_gdpr_export_requests_requested_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gdpr_export_requests_requested_at ON public.gdpr_export_requests USING btree (requested_at DESC);


--
-- Name: idx_gdpr_export_requests_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gdpr_export_requests_status ON public.gdpr_export_requests USING btree (status);


--
-- Name: idx_gdpr_export_requests_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gdpr_export_requests_user_id ON public.gdpr_export_requests USING btree (user_id);


--
-- Name: idx_group_join_requests_group_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_join_requests_group_id ON public.group_join_requests USING btree (group_id);


--
-- Name: idx_group_join_requests_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_join_requests_user_id ON public.group_join_requests USING btree (user_id);


--
-- Name: idx_group_members_group_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_members_group_id ON public.group_members USING btree (group_id);


--
-- Name: idx_group_members_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_members_user_id ON public.group_members USING btree (user_id);


--
-- Name: idx_group_messages_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_messages_created_at ON public.group_messages USING btree (created_at);


--
-- Name: idx_group_messages_group_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_messages_group_id ON public.group_messages USING btree (group_id);


--
-- Name: idx_group_resources_group_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_resources_group_id ON public.group_resources USING btree (group_id);


--
-- Name: idx_incident_reports_incident_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_incident_reports_incident_type ON public.incident_reports USING btree (incident_type);


--
-- Name: idx_incident_reports_reported_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_incident_reports_reported_at ON public.incident_reports USING btree (reported_at DESC);


--
-- Name: idx_incident_reports_reported_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_incident_reports_reported_by ON public.incident_reports USING btree (reported_by);


--
-- Name: idx_incident_reports_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_incident_reports_severity ON public.incident_reports USING btree (severity);


--
-- Name: idx_incident_reports_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_incident_reports_status ON public.incident_reports USING btree (status);


--
-- Name: idx_moderation_actions_action_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_moderation_actions_action_type ON public.moderation_actions USING btree (action_type);


--
-- Name: idx_moderation_actions_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_moderation_actions_created_at ON public.moderation_actions USING btree (created_at DESC);


--
-- Name: idx_moderation_actions_moderator_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_moderation_actions_moderator_id ON public.moderation_actions USING btree (moderator_id);


--
-- Name: idx_moderation_actions_target_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_moderation_actions_target_user_id ON public.moderation_actions USING btree (target_user_id);


--
-- Name: idx_note_folders_parent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_note_folders_parent_id ON public.note_folders USING btree (parent_id);


--
-- Name: idx_note_folders_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_note_folders_user_id ON public.note_folders USING btree (user_id);


--
-- Name: idx_notes_content_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notes_content_hash ON public.notes USING btree (content_hash) WHERE (content_hash IS NOT NULL);


--
-- Name: idx_notes_folder_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notes_folder_id ON public.notes USING btree (folder_id);


--
-- Name: idx_notes_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notes_search ON public.notes USING gin (to_tsvector('english'::regconfig, (((title)::text || ' '::text) || content)));


--
-- Name: idx_notes_summary_generated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notes_summary_generated ON public.notes USING btree (summary_generated_at) WHERE (summary IS NOT NULL);


--
-- Name: idx_notes_tags; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notes_tags ON public.notes USING gin (tags);


--
-- Name: idx_notes_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notes_user_id ON public.notes USING btree (user_id);


--
-- Name: idx_notification_preferences_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_preferences_user_id ON public.notification_preferences USING btree (user_id);


--
-- Name: idx_notifications_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at);


--
-- Name: idx_notifications_is_read; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_is_read ON public.notifications USING btree (is_read);


--
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);


--
-- Name: idx_password_reset_tokens_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_password_reset_tokens_token ON public.password_reset_tokens USING btree (token);


--
-- Name: idx_password_reset_tokens_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_password_reset_tokens_user_id ON public.password_reset_tokens USING btree (user_id);


--
-- Name: idx_privacy_assessments_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_privacy_assessments_created_at ON public.privacy_impact_assessments USING btree (created_at DESC);


--
-- Name: idx_privacy_assessments_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_privacy_assessments_created_by ON public.privacy_impact_assessments USING btree (created_by);


--
-- Name: idx_privacy_assessments_risk_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_privacy_assessments_risk_level ON public.privacy_impact_assessments USING btree (risk_level);


--
-- Name: idx_privacy_assessments_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_privacy_assessments_type ON public.privacy_impact_assessments USING btree (assessment_type);


--
-- Name: idx_resource_comments_resource_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_resource_comments_resource_id ON public.resource_comments USING btree (resource_id);


--
-- Name: idx_resource_ratings_resource_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_resource_ratings_resource_id ON public.resource_ratings USING btree (resource_id);


--
-- Name: idx_resources_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_resources_search ON public.resources USING gin (to_tsvector('english'::regconfig, (((title)::text || ' '::text) || COALESCE(description, ''::text))));


--
-- Name: idx_resources_tags; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_resources_tags ON public.resources USING gin (tags);


--
-- Name: idx_resources_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_resources_user_id ON public.resources USING btree (user_id);


--
-- Name: idx_security_events_admin_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_events_admin_id ON public.security_events USING btree (admin_id);


--
-- Name: idx_security_events_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_events_created_at ON public.security_events USING btree (created_at DESC);


--
-- Name: idx_security_events_event_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_events_event_type ON public.security_events USING btree (event_type);


--
-- Name: idx_security_events_resolved; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_events_resolved ON public.security_events USING btree (resolved);


--
-- Name: idx_security_events_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_events_severity ON public.security_events USING btree (severity);


--
-- Name: idx_security_events_source_ip; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_events_source_ip ON public.security_events USING btree (source_ip);


--
-- Name: idx_security_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_logs_created_at ON public.security_logs USING btree (created_at DESC);


--
-- Name: idx_security_logs_created_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_logs_created_severity ON public.security_logs USING btree (created_at DESC, severity);


--
-- Name: idx_security_logs_ip_address; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_logs_ip_address ON public.security_logs USING btree (ip_address);


--
-- Name: idx_security_logs_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_logs_severity ON public.security_logs USING btree (severity);


--
-- Name: idx_security_logs_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_logs_type ON public.security_logs USING btree (type);


--
-- Name: idx_security_logs_type_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_logs_type_severity ON public.security_logs USING btree (type, severity);


--
-- Name: idx_security_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_logs_user_id ON public.security_logs USING btree (user_id);


--
-- Name: idx_study_groups_owner_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_study_groups_owner_id ON public.study_groups USING btree (owner_id);


--
-- Name: idx_study_groups_tags; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_study_groups_tags ON public.study_groups USING gin (tags);


--
-- Name: idx_suspension_appeals_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_suspension_appeals_created_at ON public.suspension_appeals USING btree (created_at DESC);


--
-- Name: idx_suspension_appeals_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_suspension_appeals_status ON public.suspension_appeals USING btree (status);


--
-- Name: idx_suspension_appeals_suspension_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_suspension_appeals_suspension_id ON public.suspension_appeals USING btree (suspension_id);


--
-- Name: idx_suspension_appeals_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_suspension_appeals_user_id ON public.suspension_appeals USING btree (user_id);


--
-- Name: idx_system_config_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_config_category ON public.system_config USING btree (category);


--
-- Name: idx_system_config_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_config_key ON public.system_config USING btree (key);


--
-- Name: idx_system_config_updated_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_config_updated_by ON public.system_config USING btree (updated_by);


--
-- Name: idx_tasks_category_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_category_id ON public.tasks USING btree (category_id);


--
-- Name: idx_tasks_due_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_due_date ON public.tasks USING btree (due_date);


--
-- Name: idx_tasks_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_search ON public.tasks USING gin (to_tsvector('english'::regconfig, (((title)::text || ' '::text) || COALESCE(description, ''::text))));


--
-- Name: idx_tasks_sort_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_sort_order ON public.tasks USING btree (user_id, sort_order);


--
-- Name: idx_tasks_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_status ON public.tasks USING btree (status);


--
-- Name: idx_tasks_tags; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_tags ON public.tasks USING gin (tags);


--
-- Name: idx_tasks_user_due_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_user_due_date ON public.tasks USING btree (user_id, due_date);


--
-- Name: idx_tasks_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_user_id ON public.tasks USING btree (user_id);


--
-- Name: idx_user_suspensions_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_suspensions_created_at ON public.user_suspensions USING btree (created_at DESC);


--
-- Name: idx_user_suspensions_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_suspensions_expires_at ON public.user_suspensions USING btree (expires_at);


--
-- Name: idx_user_suspensions_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_suspensions_is_active ON public.user_suspensions USING btree (is_active);


--
-- Name: idx_user_suspensions_suspended_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_suspensions_suspended_by ON public.user_suspensions USING btree (suspended_by);


--
-- Name: idx_user_suspensions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_suspensions_user_id ON public.user_suspensions USING btree (user_id);


--
-- Name: idx_user_violations_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_violations_created_at ON public.user_violations USING btree (created_at DESC);


--
-- Name: idx_user_violations_moderator_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_violations_moderator_id ON public.user_violations USING btree (moderator_id);


--
-- Name: idx_user_violations_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_violations_severity ON public.user_violations USING btree (severity);


--
-- Name: idx_user_violations_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_violations_user_id ON public.user_violations USING btree (user_id);


--
-- Name: idx_user_violations_violation_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_violations_violation_type ON public.user_violations USING btree (violation_type);


--
-- Name: idx_users_account_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_account_status ON public.users USING btree (account_status);


--
-- Name: idx_users_account_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_account_type ON public.users USING btree (account_type);


--
-- Name: idx_users_age; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_age ON public.users USING btree (age) WHERE (age IS NOT NULL);


--
-- Name: idx_users_demographics; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_demographics ON public.users USING btree (gender, age) WHERE ((gender IS NOT NULL) OR (age IS NOT NULL));


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_email_verified; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email_verified ON public.users USING btree (email_verified);


--
-- Name: idx_users_gender; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_gender ON public.users USING btree (gender) WHERE (gender IS NOT NULL);


--
-- Name: idx_users_last_login; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_last_login ON public.users USING btree (last_login DESC);


--
-- Name: idx_users_major; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_major ON public.users USING btree (major);


--
-- Name: idx_users_oauth; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_oauth ON public.users USING btree (oauth_provider, oauth_id);


--
-- Name: idx_users_otp_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_otp_code ON public.users USING btree (otp_code);


--
-- Name: idx_users_preferred_language; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_preferred_language ON public.users USING btree (preferred_language);


--
-- Name: idx_users_university; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_university ON public.users USING btree (university);


--
-- Name: idx_users_walkthrough_completed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_walkthrough_completed ON public.users USING btree (walkthrough_completed);


--
-- Name: idx_whiteboard_elements_whiteboard_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_whiteboard_elements_whiteboard_id ON public.whiteboard_elements USING btree (whiteboard_id);


--
-- Name: idx_whiteboard_versions_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_whiteboard_versions_created_at ON public.whiteboard_versions USING btree (created_at);


--
-- Name: idx_whiteboard_versions_whiteboard_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_whiteboard_versions_whiteboard_id ON public.whiteboard_versions USING btree (whiteboard_id);


--
-- Name: idx_whiteboards_group_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_whiteboards_group_id ON public.whiteboards USING btree (group_id);


--
-- Name: idx_whiteboards_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_whiteboards_user_id ON public.whiteboards USING btree (user_id);


--
-- Name: audit_logs audit_logs_set_hash; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_logs_set_hash BEFORE INSERT ON public.audit_logs FOR EACH ROW EXECUTE FUNCTION public.set_audit_log_hash();


--
-- Name: abuse_reports update_abuse_reports_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_abuse_reports_updated_at BEFORE UPDATE ON public.abuse_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: admin_users update_admin_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON public.admin_users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: dashboard_preferences update_dashboard_preferences_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_dashboard_preferences_updated_at BEFORE UPDATE ON public.dashboard_preferences FOR EACH ROW EXECUTE FUNCTION public.update_dashboard_preferences_updated_at();


--
-- Name: data_retention_policies update_data_retention_policies_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_data_retention_policies_updated_at BEFORE UPDATE ON public.data_retention_policies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: feature_flags update_feature_flags_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_feature_flags_updated_at BEFORE UPDATE ON public.feature_flags FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: file_folders update_file_folders_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_file_folders_updated_at BEFORE UPDATE ON public.file_folders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: files update_files_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_files_updated_at BEFORE UPDATE ON public.files FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: group_join_requests update_group_join_requests_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_group_join_requests_updated_at BEFORE UPDATE ON public.group_join_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: note_folders update_note_folders_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_note_folders_updated_at BEFORE UPDATE ON public.note_folders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: notes update_notes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON public.notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: notification_preferences update_notification_preferences_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON public.notification_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: privacy_impact_assessments update_privacy_assessments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_privacy_assessments_updated_at BEFORE UPDATE ON public.privacy_impact_assessments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: resource_comments update_resource_comments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_resource_comments_updated_at BEFORE UPDATE ON public.resource_comments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: resources update_resources_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_resources_updated_at BEFORE UPDATE ON public.resources FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: study_groups update_study_groups_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_study_groups_updated_at BEFORE UPDATE ON public.study_groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: suspension_appeals update_suspension_appeals_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_suspension_appeals_updated_at BEFORE UPDATE ON public.suspension_appeals FOR EACH ROW EXECUTE FUNCTION public.update_suspension_appeals_updated_at();


--
-- Name: system_config update_system_config_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_system_config_updated_at BEFORE UPDATE ON public.system_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: task_categories update_task_categories_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_task_categories_updated_at BEFORE UPDATE ON public.task_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tasks update_tasks_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: whiteboard_elements update_whiteboard_elements_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_whiteboard_elements_updated_at BEFORE UPDATE ON public.whiteboard_elements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: whiteboards update_whiteboards_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_whiteboards_updated_at BEFORE UPDATE ON public.whiteboards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: abuse_reports abuse_reports_moderator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.abuse_reports
    ADD CONSTRAINT abuse_reports_moderator_id_fkey FOREIGN KEY (moderator_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


--
-- Name: abuse_reports abuse_reports_reported_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.abuse_reports
    ADD CONSTRAINT abuse_reports_reported_user_id_fkey FOREIGN KEY (reported_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: abuse_reports abuse_reports_reporter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.abuse_reports
    ADD CONSTRAINT abuse_reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: admin_notifications admin_notifications_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_notifications
    ADD CONSTRAINT admin_notifications_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.admin_users(id) ON DELETE CASCADE;


--
-- Name: admin_sessions admin_sessions_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_sessions
    ADD CONSTRAINT admin_sessions_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.admin_users(id) ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.admin_users(id) ON DELETE RESTRICT;


--
-- Name: backup_restorations backup_restorations_initiated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.backup_restorations
    ADD CONSTRAINT backup_restorations_initiated_by_fkey FOREIGN KEY (initiated_by) REFERENCES public.admin_users(id) ON DELETE RESTRICT;


--
-- Name: compliance_reports compliance_reports_generated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_reports
    ADD CONSTRAINT compliance_reports_generated_by_fkey FOREIGN KEY (generated_by) REFERENCES public.admin_users(id) ON DELETE RESTRICT;


--
-- Name: dashboard_preferences dashboard_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dashboard_preferences
    ADD CONSTRAINT dashboard_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: data_retention_policies data_retention_policies_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_retention_policies
    ADD CONSTRAINT data_retention_policies_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.admin_users(id) ON DELETE RESTRICT;


--
-- Name: emergency_lockdowns emergency_lockdowns_disabled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emergency_lockdowns
    ADD CONSTRAINT emergency_lockdowns_disabled_by_fkey FOREIGN KEY (disabled_by) REFERENCES public.admin_users(id) ON DELETE RESTRICT;


--
-- Name: emergency_lockdowns emergency_lockdowns_enabled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emergency_lockdowns
    ADD CONSTRAINT emergency_lockdowns_enabled_by_fkey FOREIGN KEY (enabled_by) REFERENCES public.admin_users(id) ON DELETE RESTRICT;


--
-- Name: external_auditor_access external_auditor_access_granted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_auditor_access
    ADD CONSTRAINT external_auditor_access_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.admin_users(id) ON DELETE RESTRICT;


--
-- Name: file_access_logs file_access_logs_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.file_access_logs
    ADD CONSTRAINT file_access_logs_file_id_fkey FOREIGN KEY (file_id) REFERENCES public.files(id) ON DELETE CASCADE;


--
-- Name: file_access_logs file_access_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.file_access_logs
    ADD CONSTRAINT file_access_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: file_folders file_folders_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.file_folders
    ADD CONSTRAINT file_folders_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.file_folders(id) ON DELETE CASCADE;


--
-- Name: file_folders file_folders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.file_folders
    ADD CONSTRAINT file_folders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: file_shares file_shares_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.file_shares
    ADD CONSTRAINT file_shares_file_id_fkey FOREIGN KEY (file_id) REFERENCES public.files(id) ON DELETE CASCADE;


--
-- Name: file_shares file_shares_shared_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.file_shares
    ADD CONSTRAINT file_shares_shared_by_user_id_fkey FOREIGN KEY (shared_by_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: file_shares file_shares_shared_with_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.file_shares
    ADD CONSTRAINT file_shares_shared_with_user_id_fkey FOREIGN KEY (shared_with_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: files files_folder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT files_folder_id_fkey FOREIGN KEY (folder_id) REFERENCES public.file_folders(id) ON DELETE SET NULL;


--
-- Name: files files_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT files_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: gdpr_deletion_requests gdpr_deletion_requests_requested_by_admin_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gdpr_deletion_requests
    ADD CONSTRAINT gdpr_deletion_requests_requested_by_admin_fkey FOREIGN KEY (requested_by_admin) REFERENCES public.admin_users(id) ON DELETE RESTRICT;


--
-- Name: gdpr_deletion_requests gdpr_deletion_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gdpr_deletion_requests
    ADD CONSTRAINT gdpr_deletion_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: gdpr_export_requests gdpr_export_requests_requested_by_admin_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gdpr_export_requests
    ADD CONSTRAINT gdpr_export_requests_requested_by_admin_fkey FOREIGN KEY (requested_by_admin) REFERENCES public.admin_users(id) ON DELETE RESTRICT;


--
-- Name: gdpr_export_requests gdpr_export_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gdpr_export_requests
    ADD CONSTRAINT gdpr_export_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: group_join_requests group_join_requests_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_join_requests
    ADD CONSTRAINT group_join_requests_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.study_groups(id) ON DELETE CASCADE;


--
-- Name: group_join_requests group_join_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_join_requests
    ADD CONSTRAINT group_join_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: group_members group_members_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_members
    ADD CONSTRAINT group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.study_groups(id) ON DELETE CASCADE;


--
-- Name: group_members group_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_members
    ADD CONSTRAINT group_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: group_messages group_messages_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_messages
    ADD CONSTRAINT group_messages_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.study_groups(id) ON DELETE CASCADE;


--
-- Name: group_messages group_messages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_messages
    ADD CONSTRAINT group_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: group_resources group_resources_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_resources
    ADD CONSTRAINT group_resources_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.study_groups(id) ON DELETE CASCADE;


--
-- Name: group_resources group_resources_resource_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_resources
    ADD CONSTRAINT group_resources_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES public.resources(id) ON DELETE CASCADE;


--
-- Name: group_resources group_resources_shared_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_resources
    ADD CONSTRAINT group_resources_shared_by_fkey FOREIGN KEY (shared_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: incident_reports incident_reports_reported_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incident_reports
    ADD CONSTRAINT incident_reports_reported_by_fkey FOREIGN KEY (reported_by) REFERENCES public.admin_users(id) ON DELETE RESTRICT;


--
-- Name: moderation_actions moderation_actions_abuse_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moderation_actions
    ADD CONSTRAINT moderation_actions_abuse_report_id_fkey FOREIGN KEY (abuse_report_id) REFERENCES public.abuse_reports(id) ON DELETE SET NULL;


--
-- Name: moderation_actions moderation_actions_moderator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moderation_actions
    ADD CONSTRAINT moderation_actions_moderator_id_fkey FOREIGN KEY (moderator_id) REFERENCES public.admin_users(id) ON DELETE RESTRICT;


--
-- Name: moderation_actions moderation_actions_target_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moderation_actions
    ADD CONSTRAINT moderation_actions_target_user_id_fkey FOREIGN KEY (target_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: note_folders note_folders_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.note_folders
    ADD CONSTRAINT note_folders_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.note_folders(id) ON DELETE CASCADE;


--
-- Name: note_folders note_folders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.note_folders
    ADD CONSTRAINT note_folders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: notes notes_folder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_folder_id_fkey FOREIGN KEY (folder_id) REFERENCES public.note_folders(id) ON DELETE SET NULL;


--
-- Name: notes notes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: notification_preferences notification_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: password_reset_tokens password_reset_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: privacy_impact_assessments privacy_impact_assessments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.privacy_impact_assessments
    ADD CONSTRAINT privacy_impact_assessments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.admin_users(id) ON DELETE RESTRICT;


--
-- Name: resource_comments resource_comments_resource_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resource_comments
    ADD CONSTRAINT resource_comments_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES public.resources(id) ON DELETE CASCADE;


--
-- Name: resource_comments resource_comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resource_comments
    ADD CONSTRAINT resource_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: resource_ratings resource_ratings_resource_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resource_ratings
    ADD CONSTRAINT resource_ratings_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES public.resources(id) ON DELETE CASCADE;


--
-- Name: resource_ratings resource_ratings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resource_ratings
    ADD CONSTRAINT resource_ratings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: resources resources_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resources
    ADD CONSTRAINT resources_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: security_events security_events_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_events
    ADD CONSTRAINT security_events_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


--
-- Name: security_events security_events_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_events
    ADD CONSTRAINT security_events_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.admin_users(id) ON DELETE SET NULL;


--
-- Name: security_logs security_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_logs
    ADD CONSTRAINT security_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: study_groups study_groups_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_groups
    ADD CONSTRAINT study_groups_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: suspension_appeals suspension_appeals_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suspension_appeals
    ADD CONSTRAINT suspension_appeals_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.admin_users(id);


--
-- Name: suspension_appeals suspension_appeals_suspension_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suspension_appeals
    ADD CONSTRAINT suspension_appeals_suspension_id_fkey FOREIGN KEY (suspension_id) REFERENCES public.user_suspensions(id) ON DELETE CASCADE;


--
-- Name: suspension_appeals suspension_appeals_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suspension_appeals
    ADD CONSTRAINT suspension_appeals_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: system_config system_config_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_config
    ADD CONSTRAINT system_config_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.admin_users(id) ON DELETE RESTRICT;


--
-- Name: task_categories task_categories_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_categories
    ADD CONSTRAINT task_categories_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: tasks tasks_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.task_categories(id) ON DELETE SET NULL;


--
-- Name: tasks tasks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_suspensions user_suspensions_lifted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_suspensions
    ADD CONSTRAINT user_suspensions_lifted_by_fkey FOREIGN KEY (lifted_by) REFERENCES public.admin_users(id) ON DELETE SET NULL;


--
-- Name: user_suspensions user_suspensions_suspended_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_suspensions
    ADD CONSTRAINT user_suspensions_suspended_by_fkey FOREIGN KEY (suspended_by) REFERENCES public.admin_users(id) ON DELETE RESTRICT;


--
-- Name: user_suspensions user_suspensions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_suspensions
    ADD CONSTRAINT user_suspensions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_violations user_violations_abuse_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_violations
    ADD CONSTRAINT user_violations_abuse_report_id_fkey FOREIGN KEY (abuse_report_id) REFERENCES public.abuse_reports(id) ON DELETE SET NULL;


--
-- Name: user_violations user_violations_moderator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_violations
    ADD CONSTRAINT user_violations_moderator_id_fkey FOREIGN KEY (moderator_id) REFERENCES public.admin_users(id) ON DELETE RESTRICT;


--
-- Name: user_violations user_violations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_violations
    ADD CONSTRAINT user_violations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: whiteboard_elements whiteboard_elements_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whiteboard_elements
    ADD CONSTRAINT whiteboard_elements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: whiteboard_elements whiteboard_elements_whiteboard_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whiteboard_elements
    ADD CONSTRAINT whiteboard_elements_whiteboard_id_fkey FOREIGN KEY (whiteboard_id) REFERENCES public.whiteboards(id) ON DELETE CASCADE;


--
-- Name: whiteboard_versions whiteboard_versions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whiteboard_versions
    ADD CONSTRAINT whiteboard_versions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: whiteboard_versions whiteboard_versions_whiteboard_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whiteboard_versions
    ADD CONSTRAINT whiteboard_versions_whiteboard_id_fkey FOREIGN KEY (whiteboard_id) REFERENCES public.whiteboards(id) ON DELETE CASCADE;


--
-- Name: whiteboards whiteboards_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whiteboards
    ADD CONSTRAINT whiteboards_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.study_groups(id) ON DELETE CASCADE;


--
-- Name: whiteboards whiteboards_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whiteboards
    ADD CONSTRAINT whiteboards_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict Bk1m3SXCwImePRjSedbPG20XAfdyYwpoUxjf7auijuPIWINl5DfvTfkHNiWrwg9

