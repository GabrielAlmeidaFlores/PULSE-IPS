UPDATE health_survey_dispatches SET status = 'available' WHERE status IN ('sent', 'dispatched');
