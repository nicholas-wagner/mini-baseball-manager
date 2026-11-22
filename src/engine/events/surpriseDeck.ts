import type { Club } from '../models/club';
import type { SeededRng } from '../rng/seededRng';

export type SurpriseEventCategory =
  | 'clubhouse'
  | 'ballpark'
  | 'rivalry'
  | 'media'
  | 'training'
  | 'quirky_90s';

export interface SurpriseEventChoice {
  id: string;
  label: string;
  cashDelta: number;
  hypeDelta: number;
  fanBaseDelta: number;
  bonusSp: number;
  fatigueDelta: number;
  rivalryHeatDelta: number;
  outcomeText: string;
}

export interface SurpriseEventCard {
  id: string;
  title: string;
  category: SurpriseEventCategory;
  flavor: string;
  choices: readonly [SurpriseEventChoice, SurpriseEventChoice];
}

interface RawEventSeed {
  id: string;
  title: string;
  category: SurpriseEventCategory;
  flavor: string;
  boldLabel: string;
  boldCash: number;
  boldHype: number;
  boldFans: number;
  boldSp: number;
  boldText: string;
  safeLabel: string;
  safeCash: number;
  safeHype: number;
  safeFans: number;
  safeSp: number;
  safeText: string;
}

const RAW_SURPRISE_SEEDS: readonly RawEventSeed[] = [
  { id: 'knuckle_guru', title: 'Traveling Knuckleball Guru', category: 'training', flavor: 'A 70-year-old sandlot mystic offers to teach your bullpen a fluttering pitch.', boldLabel: 'Pay $600 for Secret Clinic', boldCash: -600, boldHype: 4, boldFans: 40, boldSp: 2, boldText: 'Your staff unlocks wicked spin tricks!', safeLabel: 'Polite Autograph & Wave', safeCash: 0, safeHype: 1, safeFans: 15, safeSp: 0, safeText: 'Nice photo op for the local paper.' },
  { id: 'raining_tacos', title: 'Raining Tacos Promo Glitch', category: 'ballpark', flavor: 'The stadium t-shirt cannon accidentally got loaded with foil-wrapped tacos!', boldLabel: 'Lean Into Taco Chaos!', boldCash: -400, boldHype: 9, boldFans: 180, boldSp: 0, boldText: 'Fans go wild—trending on local cable!', safeLabel: 'Refund & Swap Back to Tees', safeCash: -150, safeHype: 2, safeFans: 25, safeSp: 0, safeText: 'Order restored with minimal salsa stains.' },
  { id: 'cereal_box', title: 'Crunch-O’s Cereal Box Cover', category: 'media', flavor: 'A 90s breakfast brand wants your star slugger grinning on 50,000 cereal boxes.', boldLabel: 'Sign Exclusive Promo Shoot', boldCash: 1800, boldHype: 7, boldFans: 140, boldSp: 0, boldText: 'Cash rolls in and kids pack the gates!', safeLabel: 'Keep Focus Strictly on Practice', safeCash: 0, safeHype: 1, safeFans: 0, safeSp: 1, safeText: 'Extra batting cage reps pay off.' },
  { id: 'mascot_heist', title: 'Rival Mascot Heist!', category: 'rivalry', flavor: 'Your crosstown rival swiped your giant foam mascot head overnight!', boldLabel: 'Stage Dramatic Halftime Rescue', boldCash: -300, boldHype: 10, boldFans: 160, boldSp: 0, boldText: 'Crowd erupts as the mascot parachutes back!', safeLabel: 'File League Protest Quietly', safeCash: 500, safeHype: 2, safeFans: 20, safeSp: 0, safeText: 'League fines your rival $500 in restitution.' },
  { id: 'walk_on_phenom', title: 'Sandlot Walk-On Phenom', category: 'training', flavor: 'A neighborhood teenager throws 95 mph against the parking-lot brick wall.', boldLabel: 'Invite to Open Tryout Camp', boldCash: -500, boldHype: 6, boldFans: 90, boldSp: 1, boldText: 'The camp sparks buzz and sharpens everyone!', safeLabel: 'Send Scouts a Note for Draft', safeCash: 0, safeHype: 2, safeFans: 15, safeSp: 0, safeText: 'Logged cleanly in your scouting binder.' },
  { id: 'viral_trick_play', title: 'Hidden-Ball Trick Play Debate', category: 'clubhouse', flavor: 'Your shortstop invented a hilarious 90s cartoon hidden-ball routine.', boldLabel: 'Greenlight It for Game Day!', boldCash: 0, boldHype: 8, boldFans: 110, boldSp: 1, boldText: 'Highlights replay all week on sports radio!', safeLabel: 'Stick to Fundamental Baseball', safeCash: 0, safeHype: 1, safeFans: 10, safeSp: 1, safeText: 'Clean, disciplined infield reps.' },
  { id: 'arcade_cabinet', title: 'Clubhouse Arcade Cabinet', category: 'clubhouse', flavor: 'A vintage 1994 baseball arcade machine shows up at a flea market.', boldLabel: 'Buy It for the Locker Room ($450)', boldCash: -450, boldHype: 7, boldFans: 35, boldSp: 1, boldText: 'Clubhouse chemistry skyrockets over high scores!', safeLabel: 'Save the Budget', safeCash: 200, safeHype: -1, safeFans: 0, safeSp: 0, safeText: 'Accountant smiles; players shrug.' },
  { id: 'bullpen_golf_cart', title: 'Runaway Bullpen Cart', category: 'ballpark', flavor: 'Your classic baseball-cap bullpen cart gets stuck in reverse before first pitch!', boldLabel: 'Turn It Into a Clown Act', boldCash: 0, boldHype: 6, boldFans: 85, boldSp: 0, boldText: 'Bleachers roar with laughter!', safeLabel: 'Call Emergency Mechanic ($350)', safeCash: -350, safeHype: 1, safeFans: 10, safeSp: 0, safeText: 'Fixed before the national anthem.' },
  { id: 'vhs_highlight', title: '90s VHS Highlight Mixtape', category: 'media', flavor: 'A local filmmaker wants to sell a synth-rock VHS tape of your season.', boldLabel: 'Co-Produce & Sell at Concessions', boldCash: 1400, boldHype: 6, boldFans: 120, boldSp: 0, boldText: 'VHS copies fly off the merch table!', safeLabel: 'Give Out Free Promo Copies', safeCash: -250, safeHype: 9, safeFans: 190, safeSp: 0, safeText: 'Word-of-mouth explodes across town!' },
  { id: 'rain_tarp_slide', title: 'Rain-Delay Tarp Slide', category: 'clubhouse', flavor: 'A passing summer cloudburst leaves the infield tarp slick as a water slide.', boldLabel: 'Let Rookies Do Belly Flops!', boldCash: 0, boldHype: 8, boldFans: 130, boldSp: 0, boldText: 'Fans stay through the rain cheering!', safeLabel: 'Keep Everyone Dry Inside', safeCash: 0, safeHype: 0, safeFans: 0, safeSp: 1, safeText: 'Dry cleats and extra video study.' },
  { id: 'grandma_cookies', title: 'Bleacher Grandma’s Lucky Cookies', category: 'clubhouse', flavor: 'A lifelong season-ticket holder bakes 4 dozen chocolate-chip cookies for the dugout.', boldLabel: 'Honor Her on the Scoreboard!', boldCash: -100, boldHype: 6, boldFans: 95, boldSp: 1, boldText: 'Instant folk hero—crowd chants her name!', safeLabel: 'Send Signed Team Ball', safeCash: 0, safeHype: 3, safeFans: 35, safeSp: 0, safeText: 'Heartwarming moment behind home plate.' },
  { id: 'organist_synth', title: 'Ballpark Organist’s New Keytar', category: 'ballpark', flavor: 'Your stadium organist brought a neon 90s keytar to riff between innings.', boldLabel: 'Give Her a Center-Field Spotlight!', boldCash: -200, boldHype: 8, boldFans: 115, boldSp: 0, boldText: 'Stomp-stomp-clap energy shakes the deck!', safeLabel: 'Stick to Classic Organ Pipes', safeCash: 0, safeHype: 2, safeFans: 25, safeSp: 0, safeText: 'Timeless ballpark charm preserved.' },
  { id: 'lucky_pine_tar', title: 'Mystery Pine-Tar Rag', category: 'quirky_90s', flavor: 'Equipment closet turns up a 1989 championship pine-tar rag.', boldLabel: 'Share It With the Lineup', boldCash: 0, boldHype: 5, boldFans: 20, boldSp: 1, boldText: 'Bats feel extra whippy in BP!', safeLabel: 'Frame It in the Lobby', safeCash: 300, safeHype: 3, safeFans: 50, safeSp: 0, safeText: 'Museum donors love the nostalgia.' },
  { id: 'little_league_clinic', title: 'Saturday Little League Clinic', category: 'media', flavor: 'Four youth sandlot squads ask your club to host a morning clinic.', boldLabel: 'Go All-Out With Free Jerseys ($500)', boldCash: -500, boldHype: 9, boldFans: 220, boldSp: 1, boldText: 'A whole generation of new fans is born!', safeLabel: 'Host a 1-Hour Q&A Session', safeCash: 0, safeHype: 4, safeFans: 70, safeSp: 0, safeText: 'Smiles all around the diamond.' },
  { id: 'neon_sunglasses', title: 'Bulk Neon Wrap-Shades Deal', category: 'quirky_90s', flavor: 'A distributor offers 2,000 surplus holographic 90s shades at clearance.', boldLabel: 'Hand Them Out on Gate Day ($650)', boldCash: -650, boldHype: 10, boldFans: 210, boldSp: 0, boldText: 'The whole grandstand gleams neon!', safeLabel: 'Sell Them at the Team Store', safeCash: 1100, safeHype: 3, safeFans: 40, safeSp: 0, safeText: 'Solid merch profit margin.' },
  { id: 'radio_feud', title: 'Drive-Time Sports Radio Diss', category: 'rivalry', flavor: 'A loudmouth broadcaster predicts your club will finish dead last.', boldLabel: 'Pin the Transcript in Clubhouse!', boldCash: 0, boldHype: 7, boldFans: 75, boldSp: 1, boldText: 'Players lock in with chip-on-shoulder fire!', safeLabel: 'Invite Him to Throw First Pitch', safeCash: 400, safeHype: 5, safeFans: 90, safeSp: 0, safeText: 'His wild bounce goes hilariously viral!' },
  { id: 'hot_dog_race', title: 'Giant Mascot Hot-Dog Race', category: 'ballpark', flavor: 'Mustard, Ketchup, and Relish want a 7th-inning stretch sprint.', boldLabel: 'Upgrade to Jet-Pack Finish ($350)', boldCash: -350, boldHype: 8, boldFans: 135, boldSp: 0, boldText: 'Best 7th-inning stretch in the league!', safeLabel: 'Classic Footrace Around Infield', safeCash: 150, safeHype: 4, safeFans: 55, safeSp: 0, safeText: 'Relish wins by a bun!' },
  { id: 'bat_dog_audition', title: 'Golden Retriever Bat-Dog Audition', category: 'ballpark', flavor: 'A joyful golden retriever named Dugout fetches bats without chewing them.', boldLabel: 'Sign Dugout to Official Contract!', boldCash: -200, boldHype: 11, boldFans: 250, boldSp: 0, boldText: 'Dugout immediately becomes the city icon!', safeLabel: 'Weekend Guest Appearances Only', safeCash: 0, safeHype: 5, safeFans: 80, safeSp: 0, safeText: 'Crowd awws every Sunday!' },
  { id: 'radar_gun_prank', title: 'Juiced Scoreboard Radar Gun', category: 'quirky_90s', flavor: 'Someone accidentally set the outfield radar display to km/h—showing 152!', boldLabel: 'Leave It Up for 1 Inning!', boldCash: 0, boldHype: 7, boldFans: 85, boldSp: 0, boldText: 'Opposing dugout looks hilariously spooked!', safeLabel: 'Recalibrate Immediately', safeCash: 0, safeHype: 1, safeFans: 10, safeSp: 1, safeText: 'Pitching coach appreciates accurate data.' },
  { id: 'pitching_machine_blitz', title: 'Overclocked Pitching Machine', category: 'training', flavor: 'Your hitting coach tuned the iron-mike cage machine up to 102 mph.', boldLabel: 'Run High-Velo Survival Drills', boldCash: 0, boldHype: 3, boldFans: 0, boldSp: 2, boldText: 'Batters’ hand-eye reaction leaps forward!', safeLabel: 'Dial Back to Normal Tempo', safeCash: 0, safeHype: 1, safeFans: 0, safeSp: 1, safeText: 'Smooth, safe swing mechanics.' },
  { id: 'throwback_flannel', title: 'Attic Trunk of 1954 Flannels', category: 'quirky_90s', flavor: 'Grounds crew discovers vintage wool throwback jerseys in storage.', boldLabel: 'Wear Them for Sunday Retro Game!', boldCash: -150, boldHype: 8, boldFans: 150, boldSp: 0, boldText: 'Classic photo day packs the stadium!', safeLabel: 'Auction Framed Sets to Collectors', safeCash: 1650, safeHype: 2, safeFans: 30, safeSp: 0, safeText: 'Collector auction nets tidy capital!' },
  { id: 'charity_dunk_tank', title: 'Manager Dunk-Tank Fundraiser', category: 'media', flavor: 'Fans will donate $20 a throw to dunk the Skipper before first pitch.', boldLabel: 'Climb Into the Tank Yourself!', boldCash: 900, boldHype: 9, boldFans: 165, boldSp: 0, boldText: 'Soaked skipper wins over the whole town!', safeLabel: 'Nominate the Rival Mascot', safeCash: 450, safeHype: 5, safeFans: 70, safeSp: 0, safeText: 'Good laughs and steady donations.' },
  { id: 'lucky_penny', title: 'Heads-Up 1994 Penny on the Mound', category: 'quirky_90s', flavor: 'Your ace spots a gleaming copper penny right behind the pitching rubber.', boldLabel: 'Tape It Inside the Cap Brim', boldCash: 0, boldHype: 4, boldFans: 15, boldSp: 1, boldText: 'Confidence surges on the mound!', safeLabel: 'Toss It in the Wishing Fountain', safeCash: 100, safeHype: 2, safeFans: 20, safeSp: 0, safeText: 'Good karma flows through the yard.' },
  { id: 'scout_tip_off', title: 'Midnight Diner Scout Tip', category: 'training', flavor: 'A retired scout sketches mechanical tweaks on a coffee-stained napkin.', boldLabel: 'Pick Up His Tab & Study Notes ($250)', boldCash: -250, boldHype: 2, boldFans: 0, boldSp: 2, boldText: 'Goldmine drill adjustments for your roster!', safeLabel: 'Thank Him & Keep Moving', safeCash: 0, safeHype: 0, safeFans: 0, safeSp: 1, safeText: 'Picked up one handy release-point cue.' },
  { id: 'bleacher_band', title: 'High School Marching Band Visit', category: 'ballpark', flavor: 'A 60-piece brass band wants to sit in right field and play fight songs.', boldLabel: 'Comp Their Tickets & Nachos ($300)', boldCash: -300, boldHype: 10, boldFans: 185, boldSp: 0, boldText: 'Thunderous brass turns the park electric!', safeLabel: 'Book Them for Pre-Game Only', safeCash: 0, safeHype: 4, safeFans: 65, safeSp: 0, safeText: 'Peppy opening ceremony!' },
  { id: 'bobblehead_typo', title: 'Misprinted Bobblehead Shipment', category: 'ballpark', flavor: 'The factory painted your star’s hair bright purple by mistake!', boldLabel: 'Market as Ultra-Rare Variant!', boldCash: 1200, boldHype: 9, boldFans: 175, boldSp: 0, boldText: 'Collectors line up three blocks deep!', safeLabel: 'Demand Factory Reprint', safeCash: 300, safeHype: 1, safeFans: 20, safeSp: 0, safeText: 'Standard bobbleheads arrive next series.' },
  { id: 'rally_possum', title: 'Outfield Wall Rally Possum', category: 'quirky_90s', flavor: 'A tiny adorable possum scurries along the warning track during a 7th-inning rally.', boldLabel: 'Print Rally Possum Shirts Tonight!', boldCash: 1350, boldHype: 10, boldFans: 195, boldSp: 0, boldText: 'Citywide Rally Possum mania takes over!', safeLabel: 'Escort Safely to Park Woods', safeCash: 0, safeHype: 4, safeFans: 50, safeSp: 0, safeText: 'Animal rescue praises your gentle crew.' },
  { id: 'rival_billboard', title: 'Trash-Talk Highway Billboard', category: 'rivalry', flavor: 'Your rival bought a billboard right outside your stadium parking lot!', boldLabel: 'Buy a Bigger Reply Sign ($600)', boldCash: -600, boldHype: 10, boldFans: 160, boldSp: 0, boldText: 'Rivalry ticket demand spikes immediately!', safeLabel: 'Answer on the Scoreboard Instead', safeCash: 0, safeHype: 5, safeFans: 45, safeSp: 1, safeText: 'Club stays cool and sharp.' },
  { id: 'foam_finger_frenzy', title: 'Oversized 4-Foot Foam Fingers', category: 'ballpark', flavor: 'A novelty vendor pitches gigantic comical #1 foam hands.', boldLabel: 'Stock the Concourse ($400)', boldCash: 950, boldHype: 6, boldFans: 105, boldSp: 0, boldText: 'Sea of giant foam hands waves on TV!', safeLabel: 'Pass on the Fad', safeCash: 0, safeHype: 0, safeFans: 0, safeSp: 0, safeText: 'Concourse stays uncluttered.' },
  { id: 'pitcher_bunt_contest', title: 'Pitchers-Only Home Run Derby', category: 'clubhouse', flavor: 'Your starting rotation begs to take BP hacks before batting practice.', boldLabel: 'Let the Pitchers Swing Away!', boldCash: 0, boldHype: 7, boldFans: 60, boldSp: 1, boldText: 'One reliever launches a 410-ft moonshot!', safeLabel: 'Protect Those Pitching Arms', safeCash: 0, safeHype: 1, safeFans: 0, safeSp: 1, safeText: 'Bullpen stays fresh and limber.' },
  { id: 'local_pizza_bet', title: 'Crosstown Pizza Shop Wager', category: 'rivalry', flavor: 'Two rival pizzerias bet 100 free pies on your next home series.', boldLabel: 'Match the Bet for Fans!', boldCash: -350, boldHype: 8, boldFans: 155, boldSp: 0, boldText: 'Neighborhood buzz hits fever pitch!', safeLabel: 'Cheer From the Sidelines', safeCash: 250, safeHype: 3, safeFans: 40, safeSp: 0, safeText: 'Pizza sponsor throws in a promo bonus.' },
  { id: 'retro_trading_cards', title: 'Local Hobby Shop Card Signing', category: 'media', flavor: 'Card collectors want a Saturday signing booth behind center field.', boldLabel: 'Sponsor Holo-Foil Packs ($300)', boldCash: 1100, boldHype: 7, boldFans: 145, boldSp: 0, boldText: 'Packs sell out before the 3rd inning!', safeLabel: 'Free Autograph Table Only', safeCash: 0, safeHype: 5, safeFans: 95, safeSp: 0, safeText: 'Kids beam holding signed cards.' },
  { id: 'sunflower_seed_shortage', title: 'Dugout Sunflower Seed Shortage', category: 'clubhouse', flavor: 'Delivery truck missed the stadium—dugout bucket is completely empty!', boldLabel: 'Emergency Ranch-Seed Airlift ($200)', boldCash: -200, boldHype: 5, boldFans: 20, boldSp: 1, boldText: 'Clubhouse morale saved in heroic fashion!', safeLabel: 'Switch to Bubblegum Buckets', safeCash: 0, safeHype: 3, safeFans: 10, safeSp: 0, safeText: 'Epic bubble-blowing contest breaks out.' },
  { id: 'groundskeeper_art', title: 'Checkerboard Turf Masterpiece', category: 'ballpark', flavor: 'Your groundskeeper wants to mow a 90s lightning-bolt pattern in center.', boldLabel: 'Approve the Radical Mowing!', boldCash: -150, boldHype: 7, boldFans: 110, boldSp: 0, boldText: 'Broadcast helicopters zoom in on the grass!', safeLabel: 'Keep Classic Parallel Stripes', safeCash: 0, safeHype: 2, safeFans: 20, safeSp: 0, safeText: 'Crisp old-school diamond look.' },
  { id: 'tv_blooper_reel', title: 'National Blooper Reel Feature', category: 'media', flavor: 'A highlight show wants to air your catcher’s goofy dugout dance.', boldLabel: 'Send Them 3 More Clips!', boldCash: 750, boldHype: 8, boldFans: 170, boldSp: 0, boldText: 'Your club becomes America’s favorite underdog!', safeLabel: 'Keep Clubhouse Footage Private', safeCash: 0, safeHype: 1, safeFans: 0, safeSp: 1, safeText: 'Tight-knit dugout focus.' },
  { id: 'vintage_bat_lathe', title: 'Artisan Maple Bat Maker Visit', category: 'training', flavor: 'A master woodturner offers custom-balanced bats for your top hitters.', boldLabel: 'Commission Custom Barrels ($550)', boldCash: -550, boldHype: 4, boldFans: 30, boldSp: 2, boldText: 'Sweet-spot crack sounds louder immediately!', safeLabel: 'Test Two Demo Bats Free', safeCash: 0, safeHype: 1, safeFans: 0, safeSp: 1, safeText: 'Clean barrel feedback.' },
  { id: 'fireworks_upgrade', title: 'Surplus 4th-of-July Fireworks', category: 'ballpark', flavor: 'Pyro crew offers double shells for Friday night post-game.', boldLabel: 'Light Up the Whole Sky ($500)', boldCash: -500, boldHype: 11, boldFans: 230, boldSp: 0, boldText: 'Unforgettable Friday night sellout energy!', safeLabel: 'Stick to Standard Finale', safeCash: 0, safeHype: 3, safeFans: 45, safeSp: 0, safeText: 'Pretty sparks over center field.' },
  { id: 'rainout_doubleheader', title: 'Old-School Twi-Night Doubleheader', category: 'ballpark', flavor: 'League offers a throwback single-admission doubleheader promo.', boldLabel: 'Two Games, One Ticket!', boldCash: 1050, boldHype: 8, boldFans: 190, boldSp: 0, boldText: 'Old-timers cheer the classic baseball marathon!', safeLabel: 'Keep Regular Single Schedule', safeCash: 200, safeHype: 1, safeFans: 20, safeSp: 0, safeText: 'Pitching staff stays well-rested.' },
  { id: 'rookie_costume_trip', title: 'Rookie Road-Trip Costume Tradition', category: 'clubhouse', flavor: 'Veterans want rookies to wear 90s superhero capes onto the team bus.', boldLabel: 'Encourage Fun Team Bonding!', boldCash: 0, boldHype: 6, boldFans: 80, boldSp: 1, boldText: 'Hilarious photos bring the roster closer!', safeLabel: 'Keep It Business Casual', safeCash: 0, safeHype: 1, safeFans: 0, safeSp: 0, safeText: 'Calm, quiet road trip.' },
  { id: 'scout_drone_kite', title: 'Rival Spy Kite Over Center Field', category: 'rivalry', flavor: 'A suspicious box-kite with binoculars hovers outside your practice cage.', boldLabel: 'Run Fake Decoy Signs All Afternoon!', boldCash: 0, boldHype: 6, boldFans: 65, boldSp: 1, boldText: 'Rival falls for your decoy signs!', safeLabel: 'Move Batting Practice Indoors', safeCash: -100, safeHype: 1, safeFans: 0, safeSp: 1, safeText: 'Secrets locked down cleanly.' },
  { id: 'nachos_helmet', title: 'Mega Batting-Helmet Nacho Bowl', category: 'ballpark', flavor: 'Concessions chef unveils a full-size helmet overflowing with queso.', boldLabel: 'Launch Signature Stadium Item!', boldCash: 1450, boldHype: 7, boldFans: 140, boldSp: 0, boldText: 'Instant stadium culinary legend!', safeLabel: 'Test in One Section First', safeCash: 550, safeHype: 3, safeFans: 40, safeSp: 0, safeText: 'Steady food-stand reviews.' },
  { id: 'film_room_marathon', title: 'Late-Night Pitcher Tape Marathon', category: 'training', flavor: 'Your catcher spots a subtle glove-tap tell on your division’s top ace.', boldLabel: 'Gather Whole Lineup to Study!', boldCash: 0, boldHype: 4, boldFans: 0, boldSp: 2, boldText: 'Hitters sharpen their pitch recognition!', safeLabel: 'Share Brief Scouting Sheet', safeCash: 0, safeHype: 1, safeFans: 0, safeSp: 1, safeText: 'Clean tactical preparation.' },
  { id: 'kids_run_bases', title: 'Sunday Kids Run the Bases', category: 'ballpark', flavor: 'Hundreds of kids line up down the first-base chalk after the final out.', boldLabel: 'Have Whole Roster High-Five Home Plate!', boldCash: -100, boldHype: 9, boldFans: 210, boldSp: 0, boldText: 'Pure sandlot magic—families book next week!', safeLabel: 'Send Mascot Out to Greet Them', safeCash: 0, safeHype: 4, safeFans: 75, safeSp: 0, safeText: 'Cheerful post-game tradition.' },
  { id: 'vintage_boombox', title: 'Walk-Up Music Boombox Upgrade', category: 'quirky_90s', flavor: 'Players compile a blistering 1994 cassette tape of walk-up anthems.', boldLabel: 'Blast It Over Stadium PA!', boldCash: -150, boldHype: 8, boldFans: 115, boldSp: 0, boldText: 'Stands clap along to every at-bat!', safeLabel: 'Keep It Inside the Weight Room', safeCash: 0, safeHype: 3, safeFans: 0, safeSp: 1, safeText: 'High-energy lifts all week.' },
  { id: 'alumni_night', title: 'Sandlot Legends Alumni Night', category: 'media', flavor: 'Retired neighborhood stars gather to share tales from the 1970s.', boldLabel: 'Host Pre-Game Legends Banquet ($400)', boldCash: -400, boldHype: 7, boldFans: 165, boldSp: 1, boldText: 'Young players soak up priceless wisdom!', safeLabel: 'Pre-Game Ceremonial First Pitch', safeCash: 250, safeHype: 4, safeFans: 80, safeSp: 0, safeText: 'Standing ovation from longtime fans.' },
  { id: 'lucky_socks', title: 'Neon High-Stirrup Uniform Craze', category: 'quirky_90s', flavor: 'Half the roster rolled up their pants to flash electric stirrup socks.', boldLabel: 'Make High Stirrups Team-Wide!', boldCash: -200, boldHype: 8, boldFans: 130, boldSp: 0, boldText: 'Best-dressed squad in the league!', safeLabel: 'Player’s Choice Style', safeCash: 0, safeHype: 3, safeFans: 30, safeSp: 0, safeText: 'Relaxed clubhouse swagger.' },
  { id: 'speed_track_day', title: 'Olympic Sprint Coach Guest Day', category: 'training', flavor: 'A track coach visits to teach explosive first-step base-stealing jumps.', boldLabel: 'Book Full Baserunning Clinic ($450)', boldCash: -450, boldHype: 4, boldFans: 20, boldSp: 2, boldText: 'Runners explode off first base!', safeLabel: '30-Minute Warmup Demo', safeCash: 0, safeHype: 1, safeFans: 0, safeSp: 1, safeText: 'Clean lead-off mechanics.' },
  { id: 'home_run_apple', title: 'DIY Center-Field Home-Run Prop', category: 'ballpark', flavor: 'Local shop class built a giant spring-loaded mascot prop for home runs.', boldLabel: 'Install It Beyond Center Wall ($300)', boldCash: -300, boldHype: 9, boldFans: 155, boldSp: 0, boldText: 'Instant cult-classic ballpark landmark!', safeLabel: 'Display in the Front Plaza', safeCash: 0, safeHype: 4, safeFans: 60, safeSp: 0, safeText: 'Great selfie spot for fans.' },
  { id: 'bus_karaoke', title: 'Rain-Delayed Team Bus Karaoke', category: 'clubhouse', flavor: 'Traffic stalls the team bus for two hours—someone finds a microphone.', boldLabel: 'Lead a Full-Roster Singalong!', boldCash: 0, boldHype: 7, boldFans: 45, boldSp: 1, boldText: 'Unbreakable dugout bond forged on I-95!', safeLabel: 'Put on Classic Baseball Movie', safeCash: 0, safeHype: 3, safeFans: 0, safeSp: 0, safeText: 'Relaxed, well-rested squad.' },
  { id: 'penny_soda_night', title: 'Throwback 90s Nickel-Soda Night', category: 'ballpark', flavor: 'Turbo Fizz offers to co-sponsor 5-cent fountain sodas for one game.', boldLabel: 'Partner Up for Packed Stands!', boldCash: 850, boldHype: 10, boldFans: 240, boldSp: 0, boldText: 'Record crowd packs every aisle!', safeLabel: 'Keep Standard $2 Cups', safeCash: 450, safeHype: 2, safeFans: 35, safeSp: 0, safeText: 'Steady concessions margin.' },
  { id: 'glove_re_lacing', title: 'Master Glove-Lacer Workshop', category: 'training', flavor: 'An old-school leather craftsman offers to custom-lace every infield mitt.', boldLabel: 'Re-Lace the Whole Defense ($350)', boldCash: -350, boldHype: 3, boldFans: 10, boldSp: 2, boldText: 'Pocket pop sounds crisper on every grounder!', safeLabel: 'Just Fix Worn Catcher Mitt', safeCash: -75, safeHype: 1, safeFans: 0, safeSp: 1, safeText: 'Catcher’s mitt feels brand new.' },
  { id: 'rivalry_trophy_polish', title: 'Rivalry Cup Parade Challenge', category: 'rivalry', flavor: 'Local mayor challenges both rival clubs to a pre-series downtown rally.', boldLabel: 'Roll Out the Brass Band Float ($400)', boldCash: -400, boldHype: 11, boldFans: 225, boldSp: 0, boldText: 'The whole city paints itself in your colors!', safeLabel: 'Send Captain for Press Photo', safeCash: 300, safeHype: 4, safeFans: 70, safeSp: 0, safeText: 'Classy media coverage.' },
];

/** 52 handcrafted 90s narrative surprise event cards with branching trade-offs. */
export const SURPRISE_EVENTS_DECK: readonly SurpriseEventCard[] = RAW_SURPRISE_SEEDS.map((raw) => ({
  id: raw.id,
  title: raw.title,
  category: raw.category,
  flavor: raw.flavor,
  choices: [
    {
      id: `${raw.id}_bold`,
      label: raw.boldLabel,
      cashDelta: raw.boldCash,
      hypeDelta: raw.boldHype,
      fanBaseDelta: raw.boldFans,
      bonusSp: raw.boldSp,
      fatigueDelta: raw.category === 'training' ? 4 : 0,
      rivalryHeatDelta: raw.category === 'rivalry' ? 12 : 0,
      outcomeText: raw.boldText,
    },
    {
      id: `${raw.id}_safe`,
      label: raw.safeLabel,
      cashDelta: raw.safeCash,
      hypeDelta: raw.safeHype,
      fanBaseDelta: raw.safeFans,
      bonusSp: raw.safeSp,
      fatigueDelta: 0,
      rivalryHeatDelta: raw.category === 'rivalry' ? 4 : 0,
      outcomeText: raw.safeText,
    },
  ] as const,
}));

/** Draws a context-aware surprise event card avoiding recently seen IDs. */
export function drawSurpriseEvent(
  rng: SeededRng,
  seenEventIds: readonly string[] = [],
  preferredCategory?: SurpriseEventCategory,
): SurpriseEventCard {
  const unseen = SURPRISE_EVENTS_DECK.filter((c) => !seenEventIds.includes(c.id));
  const pool = unseen.length > 0 ? unseen : SURPRISE_EVENTS_DECK;
  if (preferredCategory) {
    const matching = pool.filter((c) => c.category === preferredCategory);
    if (matching.length > 0) return rng.pick(matching);
  }
  return rng.pick(pool);
}

/** Applies the chosen surprise-event outcome cleanly to club cash, hype, fans, and player SP. */
export function applySurpriseEventChoice(
  rng: SeededRng,
  club: Club,
  card: SurpriseEventCard,
  choiceId: string,
): { applied: boolean; club: Club; choice: SurpriseEventChoice | null; boostedPlayerName?: string } {
  const choice = card.choices.find((c) => c.id === choiceId) ?? null;
  if (!choice) return { applied: false, club, choice: null };

  let boostedPlayerName: string | undefined;
  let nextRoster = club.roster;
  if (choice.bonusSp > 0 && club.roster.length > 0) {
    const beneficiary = rng.pick(club.roster);
    boostedPlayerName = beneficiary.name;
    nextRoster = club.roster.map((p) =>
      p.id === beneficiary.id
        ? {
            ...p,
            skillPoints: p.skillPoints + choice.bonusSp,
            fatigue: Math.min(100, Math.max(0, p.fatigue + choice.fatigueDelta)),
          }
        : p,
    );
  }

  return {
    applied: true,
    choice,
    boostedPlayerName,
    club: {
      ...club,
      roster: nextRoster,
      economy: {
        ...club.economy,
        cash: Math.max(0, club.economy.cash + choice.cashDelta),
        teamHype: Math.max(0, Math.min(100, club.economy.teamHype + choice.hypeDelta)),
        fanBase: Math.max(100, club.economy.fanBase + choice.fanBaseDelta),
      },
    },
  };
}
