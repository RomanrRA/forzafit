-- Демо-данные для проверки слоя «Характеристики». Безопасно удалить вместе с тестовым юзером.
DO $$
DECLARE
  uid uuid := 'f4558c08-f674-4e3e-829a-552d1c2fa7d2';
  ex_chest uuid; ex_back uuid; ex_legs uuid; ex_sh uuid; ex_arm uuid; ex_core uuid;
  sess uuid; we uuid;
BEGIN
  SELECT id INTO ex_chest FROM exercises WHERE 'chest'=ANY(primary_muscles) ORDER BY name LIMIT 1;
  SELECT id INTO ex_back  FROM exercises WHERE 'lats'=ANY(primary_muscles) ORDER BY name LIMIT 1;
  SELECT id INTO ex_legs  FROM exercises WHERE 'quadriceps'=ANY(primary_muscles) ORDER BY name LIMIT 1;
  SELECT id INTO ex_sh    FROM exercises WHERE 'shoulders'=ANY(primary_muscles) ORDER BY name LIMIT 1;
  SELECT id INTO ex_arm   FROM exercises WHERE 'biceps'=ANY(primary_muscles) ORDER BY name LIMIT 1;
  SELECT id INTO ex_core  FROM exercises WHERE 'abdominals'=ANY(primary_muscles) ORDER BY name LIMIT 1;

  INSERT INTO body_measurements(user_id, date, weight_kg) VALUES (uid, now(), 80);

  INSERT INTO streaks(user_id, current_count, longest_count, last_activity_date)
  VALUES (uid, 12, 20, now())
  ON CONFLICT (user_id) DO UPDATE SET current_count=12, longest_count=20;

  INSERT INTO personal_records(user_id, exercise_id, type, value_kg, reps, achieved_at) VALUES
    (uid, ex_chest,'one_rm',120,1, now()),
    (uid, ex_legs, 'one_rm',180,1, now()),
    (uid, ex_back, 'one_rm',110,1, now()),
    (uid, ex_sh,   'one_rm', 70,1, now())
  ON CONFLICT (user_id, exercise_id, type) DO NOTHING;

  INSERT INTO pr_history(user_id, exercise_id, type, previous_value_kg, value_kg, reps, achieved_at) VALUES
    (uid, ex_chest,'one_rm',115,120,1, now()-interval '3 day'),
    (uid, ex_legs, 'one_rm',175,180,1, now()-interval '10 day'),
    (uid, ex_back, 'one_rm',105,110,1, now()-interval '20 day'),
    (uid, ex_sh,   'one_rm', 65, 70,1, now()-interval '30 day');

  INSERT INTO workout_sessions(user_id, title, started_at, finished_at)
  VALUES (uid,'Demo', now()-interval '1 hour', now()) RETURNING id INTO sess;

  INSERT INTO workout_exercises(session_id, exercise_id, order_index) VALUES (sess, ex_chest, 0) RETURNING id INTO we;
  INSERT INTO workout_sets(workout_exercise_id, weight_kg, reps, completed) VALUES (we,90,8,true),(we,90,8,true),(we,85,10,true);
  INSERT INTO workout_exercises(session_id, exercise_id, order_index) VALUES (sess, ex_legs, 1) RETURNING id INTO we;
  INSERT INTO workout_sets(workout_exercise_id, weight_kg, reps, completed) VALUES (we,140,8,true),(we,140,6,true),(we,120,10,true);
  INSERT INTO workout_exercises(session_id, exercise_id, order_index) VALUES (sess, ex_back, 2) RETURNING id INTO we;
  INSERT INTO workout_sets(workout_exercise_id, weight_kg, reps, completed) VALUES (we,80,10,true),(we,80,10,true);
  INSERT INTO workout_exercises(session_id, exercise_id, order_index) VALUES (sess, ex_sh, 3) RETURNING id INTO we;
  INSERT INTO workout_sets(workout_exercise_id, weight_kg, reps, completed) VALUES (we,50,12,true),(we,50,10,true);
  INSERT INTO workout_exercises(session_id, exercise_id, order_index) VALUES (sess, ex_arm, 4) RETURNING id INTO we;
  INSERT INTO workout_sets(workout_exercise_id, weight_kg, reps, completed) VALUES (we,20,12,true),(we,20,12,true);
  INSERT INTO workout_exercises(session_id, exercise_id, order_index) VALUES (sess, ex_core, 5) RETURNING id INTO we;
  INSERT INTO workout_sets(workout_exercise_id, reps, completed) VALUES (we,20,true),(we,20,true);

  RAISE NOTICE 'seeded: chest=% back=% legs=% sh=% arm=% core=%', ex_chest, ex_back, ex_legs, ex_sh, ex_arm, ex_core;
END $$;
