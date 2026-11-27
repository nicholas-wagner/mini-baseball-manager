export type CharacterAnimClip =
  | 'idle'
  | 'pitch_fist_pump'
  | 'pitch_salute'
  | 'pitch_gather'
  | 'glove_tap'
  | 'catch_frame'
  | 'pitch_set'
  | 'pitch_stretch_set'
  | 'pitch_stretch'
  | 'pitch_shake_off'
  | 'pitch_windup'
  | 'pitch_super'
  | 'bat_contact_set'
  | 'bat_power_set'
  | 'helmet_tip'
  | 'rail_lean'
  | 'bat_stance'
  | 'bat_swing'
  | 'bat_bunt'
  | 'bat_bomb'
  | 'catch_receive'
  | 'field_ready'
  | 'field_scoop'
  | 'field_throw'
  | 'field_pop'
  | 'field_receive'
  | 'runner_slide'
  | 'field_tag'
  | 'slide_safe'
  | 'catch_handoff'
  | 'catch_point'
  | 'catch_target'
  | 'catch_throw'
  | 'runner_glance'
  | 'runner_push'
  | 'runner_lead'
  | 'field_run'
  | 'field_dive'
  | 'field_high_jump'
  | 'practice_cage'
  | 'practice_bullpen'
  | 'celebrate_hr';

// Release on an exact pose in the standee's 16-frame animation cycle.
export const deliveryClip = (fromStretch = false) => fromStretch ? 'pitch_stretch' : 'pitch_windup';
export const PITCH_RELEASE_PHASE = 9 / 16;
export const GLOVE_CONTACT_PHASE = { field_dive: 8 / 16, field_high_jump: 10 / 16 } as const;

export const CLIP_DURATIONS: Record<CharacterAnimClip, number> = {
  idle: 2.0,
  pitch_gather: 1.6,
  glove_tap: 1.4,
  catch_frame: .36,
  pitch_set: 3.2,
  pitch_stretch_set: 3.4,
  pitch_stretch: .89,
  pitch_shake_off: .72,
  pitch_salute: .66,
  pitch_fist_pump: .52,
  pitch_windup: 1.35,
  pitch_super: 1.65,
  bat_contact_set: 1,
  bat_power_set: 1,
  helmet_tip: 1.6,
  rail_lean: 1,
  bat_stance: 1.8,
  bat_swing: 0.95,
  bat_bunt: 0.9,
  bat_bomb: 1.55,
  field_ready: 1.6,
  catch_receive: 0.42,
  field_scoop: 0.7,
  field_throw: 0.65,
  field_receive: 0.7,
  field_pop: 0.7,
  runner_slide: .72,
  field_tag: .68,
  catch_target: .8,
  slide_safe: 1,
  catch_handoff: 1,
  catch_point: .75,
  catch_throw: .68,
  runner_glance: .52,
  runner_push: .19,
  runner_lead: 1.0,
  field_run: 0.52,
  field_dive: 1.15,
  field_high_jump: 1.2,
  practice_cage: 1.4,
  practice_bullpen: 1.45,
  celebrate_hr: 1.3,
};
