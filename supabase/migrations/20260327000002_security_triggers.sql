-- Phase 3 Security Triggers (Leave Balances & Payroll Locking)

-- 1. Leave Balance Enforcement Trigger
CREATE OR REPLACE FUNCTION handle_leave_request_status()
RETURNS TRIGGER AS $$
DECLARE
    v_total NUMERIC;
    v_used NUMERIC;
    v_is_unpaid BOOLEAN;
BEGIN
    -- Phase 4: Self-approval check (Hierarchical Logic)
    IF NEW.status = 'approved' AND NEW.user_id = auth.uid() THEN
        RAISE EXCEPTION 'Hierarchical Violation: Self-approval is strictly forbidden.';
    END IF;

    -- Check if leave type is paid or unpaid
    SELECT is_unpaid INTO v_is_unpaid FROM leave_types WHERE id = NEW.leave_type_id;
    
    -- When a leave request is APPROVED
    IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
        IF NOT v_is_unpaid THEN
            -- Get current balances
            SELECT total_days, used_days INTO v_total, v_used 
            FROM leave_balances 
            WHERE user_id = NEW.user_id AND leave_type_id = NEW.leave_type_id;

            -- Prevent overdrafts mathematically
            IF (v_used + NEW.days) > v_total THEN
                RAISE EXCEPTION 'Insufficient leave balance (Requested: %, Available: %).', NEW.days, (v_total - v_used);
            END IF;

            -- Deduct balance automatically
            UPDATE leave_balances 
            SET used_days = used_days + NEW.days 
            WHERE user_id = NEW.user_id AND leave_type_id = NEW.leave_type_id;
        END IF;

    -- When an already-approved leave request is REJECTED or CANCELLED (Refund)
    ELSIF NEW.status != 'approved' AND OLD.status = 'approved' THEN
        IF NOT v_is_unpaid THEN
            -- Refund balance automatically
            UPDATE leave_balances 
            SET used_days = used_days - OLD.days 
            WHERE user_id = OLD.user_id AND leave_type_id = OLD.leave_type_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_handle_leave_request_status ON leave_requests;
CREATE TRIGGER trg_handle_leave_request_status
BEFORE UPDATE ON leave_requests
FOR EACH ROW
EXECUTE FUNCTION handle_leave_request_status();


-- 2. Payroll Lock Cascade Trigger
CREATE OR REPLACE FUNCTION cascade_payroll_lock()
RETURNS TRIGGER AS $$
BEGIN
    -- When a payroll run is finalized/locked
    IF NEW.status = 'locked' AND OLD.status != 'locked' THEN
        UPDATE payroll_items
        SET status = 'approved'
        WHERE run_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cascade_payroll_lock ON payroll_runs;
CREATE TRIGGER trg_cascade_payroll_lock
AFTER UPDATE ON payroll_runs
FOR EACH ROW
EXECUTE FUNCTION cascade_payroll_lock();
