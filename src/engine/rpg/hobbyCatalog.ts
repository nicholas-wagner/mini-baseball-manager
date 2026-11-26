import type { NationalityId } from '../nationalities/types';

interface Hobby {
  id: string;
  title: string;
  clue: string;
  stories: readonly string[];
}

function hobby(id: string, title: string, clue: string, ...stories: [string, ...string[]]): Hobby {
  return { id, title, clue, stories };
}

// First edition. Keep this pool and its order stable; curate new assignments by player ID.
export const sharedHobbies = [
  hobby('beach-volleyball', 'Beach volleyball', 'I shook half the beach out of my bag.', 'Did you see that sand flying? My partner calls that my emergency landing.', 'We draw our court with a stick. High tide gets final say on the doubles schedule.'),
  hobby('park-chess', 'Park chess', 'My opponent brings tea for both of us.', 'She offered me a rook and I took it. That little smile should have been my warning.', 'My favorite table is missing a pawn. We use an acorn and protect it like royalty.'),
  hobby('sunbathing', 'Sunbathing', 'I saved the last sunny spot on my towel for a paperback.', 'If the book gets good, I stay until the umbrella shadow reaches my radio.', 'My idea of a perfect afternoon is a sea breeze and a whole cassette before I move.'),
  hobby('crochet', 'Crocheting hats', 'The fruit bowl is looking unusually well dressed.', 'A cantaloupe sits still for a fitting. My little cousins could learn a thing or two.', 'I made my first pom-pom so big the hat keeps falling over my eyes. I like it that way.'),
  hobby('computer-programming', 'Computer programming', 'I needed a second screen for the tail.', 'The dragon finally stretches across both monitors. I drew every scale on graph paper first.', 'My homemade adventure game has one room so far. Everybody keeps trying to pet the rug.'),
  hobby('ham-radio', 'Ham radio', 'There is a postcard on my desk with six letters and numbers.', 'Someone across the ocean heard me on the antenna I built. Their confirmation card gets the good frame.', 'I heard my neighbor on the air for years before I recognized the voice in the grocery line.'),
  hobby('ballroom', 'Ballroom dancing', 'I count to three while I wait for the kettle.', 'My partner and I waltz between the kitchen chairs. For the final turn we have to open the fridge.', 'We saved up for satin and a proper night out. I still have the coat-check ticket.'),
  hobby('climbing', 'Rock climbing', 'Feel how smooth this little patch of stone is.', 'My climbing buddy named the route after my laugh. You can hear exactly where I get stuck.', 'Three trips to solve one move. I went back a fourth time just to enjoy it.'),
  hobby('hiking', 'Hiking', 'There is a folded map drying on my windowsill.', 'I draw tiny teacups where we stop for a thermos break. It is slowly becoming a very good map.'),
  hobby('camping', 'Camping', 'My best recipe uses one tin mug.', 'The tent leaked, the cocoa did not, and we all remember that weekend as a success.'),
  hobby('juggling', 'Juggling', 'I always buy oranges in threes.', 'I can keep three scarves in the air through an entire song. The oranges and I are still negotiating.'),
  hobby('magic', 'Close-up magic', 'Keep an eye on the red silk handkerchief.', 'My grandma knows where the coin goes. She gasps louder than anyone else anyway.'),
  hobby('singing', 'Singing', 'You take the melody. I hear another part.', 'My sister and I hold the last harmony until one of us starts laughing. I always lose.'),
  hobby('swimming', 'Swimming', 'My watch smells faintly of chlorine.', 'I get the pool to myself for exactly six minutes before the morning regulars arrive. Best six minutes of my day.'),
  hobby('eating-contests', 'Food eating contests', 'That little blue ribbon has pie filling on it.', 'The county fair gave me a ribbon and a photograph. My whole face is purple in both.'),
  hobby('tv-pajamas', 'TV nights in pajamas', 'Friday has a strict flannel dress code.', 'When the mystery theme starts, everybody writes down a suspect. Even the cat gets a guess.'),
  hobby('video-games', 'Video games', 'Those three initials on the high-score screen are mine.', 'My brother steers and I handle the jumps. Neither of us can beat that level alone.'),
  hobby('board-games', 'Board games', 'I keep a spare die in the biscuit tin.', 'We lost the blue game piece in 1989. Even after we found it, Dad insisted on playing as the button.'),
  hobby('fantasy-cards', 'Fantasy card games', 'I traded three shiny cards for one ridiculous frog.', 'My whole deck runs on swamp frogs. Nobody laughs once the fourth frog shows up.', 'My friends paint their own deck boxes. Mine has a drawbridge and a very tiny moat.'),
  hobby('reading', 'Reading books', 'My bus tickets all have creases in the same place.', 'I use each ticket as a bookmark and leave it inside. My bookshelf doubles as a travel diary.'),
  hobby('frisbee', 'Frisbee', 'The dog knows which disc is hers.', 'Our best throw curved around the picnic table and landed in a laundry basket. Naturally we invented a league.'),
  hobby('pottery', 'Pottery', 'Please ignore the thumbprint on that mug.', 'My first mug leans so far left it can only hold pencils. Every pencil I own lives in it.'),
  hobby('painting', 'Painting', 'Look closely at the blue on my cuff.', 'I have painted that corner shop seven times. Every time I go back the owner changes the awning.'),
  hobby('cinema', 'Going to the movies', 'My ticket stubs are sorted by the opening music.', 'My friend and I stay until the last credit. We pick a name and imagine what their day was like.'),
  hobby('golf', 'Golf', 'I bring a pencil even when nobody keeps score.', 'I sketch each green in my scorebook. The little skull marks where I lost three balls in one afternoon.'),
  hobby('bowling', 'Bowling', 'I embroidered my own Tuesday-night shirt.', 'My aunt taught me to pick up a spare. She also taught me the victory shuffle, which took longer.'),
  hobby('photography', 'Film photography', 'I always save the last frame.', 'The last shot is for whoever took the other photos. Otherwise the person carrying the camera disappears.'),
  hobby('birding', 'Bird watching', 'That squeaky wheel sounds exactly like a call I know.', 'My field guide has a smudged thumbprint beside every bird I have seen from the kitchen.'),
  hobby('mecha-kits', 'Building mecha models', 'This tiny shield took me all weekend.', 'My display robot has one unpainted shoulder. My nephew insists that is where the moonlight hits.', 'The model club built a city from cereal boxes. My robot is officially taller than the post office.'),
  hobby('anime-club', 'Anime club', 'Thursday means a stack of VHS tapes and three folding chairs.', 'We freeze the tape at our favorite frames and draw them. Our robot dog looks different in every sketchbook.'),
  hobby('weights', 'Lifting weights', 'My smallest plates have little stars painted on them.', 'My training partner chalks up the new number and underlines it twice. I keep the old chalkboard photos.'),
  hobby('shopping', 'Shopping', 'Guess how much I paid for these boots.', 'My friend and I take five dollars each to the flea market. The stranger find wins the bus ride home.'),
  hobby('downhill-skiing', 'Downhill skiing', 'My lift tickets are still tied to my zipper.', 'I take the first lift for the sound of ski edges on fresh corduroy. Breakfast can wait.'),
  hobby('water-skiing', 'Water skiing', 'We meet at the dock before the wind wakes up.', 'The lake was so flat I could see the red skis in its reflection. Then Dad waved and I sat down hard.'),
  hobby('sightseeing', 'Sightseeing', 'I circle things the guidebook leaves out.', 'Every new town gets one afternoon on foot. The tiny clock over the bakery beat the famous tower by a mile.'),
  hobby('clubbing', 'Going clubbing', 'I saved the flyer with the silver lettering.', 'Three of us practiced that move in the hallway. When the DJ finally played our song we forgot it and danced anyway.'),
  hobby('leatherwork', 'Leatherworking', 'Run your finger along the edge of this wallet.', 'I stamped a tiny bee inside the coin pocket. The person who carries it gets the only good view.'),
  hobby('sewing', 'Sewing', 'The lining is the best part of this jacket.', 'I sewed secret star-print pockets into my dance jacket. Even when I miss a step I have stars in my hands.'),
  hobby('trains', 'Trainspotting', 'That whistle is the morning local.', 'My notebook has the number of every engine that crossed our footbridge the summer the timetable changed.'),
  hobby('museums', 'Going to museums', 'I always ask the guard for a favorite room.', 'Once a guard sent me past three galleries to see one little blue bowl. Now I visit it like an old friend.'),
  hobby('mini-golf', 'Mini golf', 'Ask me about the windmill. Actually, give me a minute.', 'I drew a diagram for hole seven. My little cousin banked it off the alligator and beat me anyway.'),
  hobby('aviation', 'Aviation', 'My notebook is full of wing silhouettes.', 'We sit by the little airfield with a packed lunch. My friend guesses the engine and I guess the plane.'),
  hobby('skydiving', 'Skydiving', 'My logbook has a drawing of a patchwork field.', 'After the canopy opened, the best part was how quiet it got. I tried to draw the view before I forgot.'),
  hobby('rafting', 'Whitewater rafting', 'We named our crew after a soggy sandwich.', 'At the takeout we compare splash marks on our helmets. Lunch is always in a dry bag now.'),
  hobby('canoeing', 'Canoeing', 'One paddle, two sandwiches, no hurry.', 'We paddle to the same island for breakfast. Whoever spots the heron gets the last pancake.'),
  hobby('kayaking', 'Kayaking', 'There is a tide table tucked into my dry bag.', 'My little kayak fits through the sea arch. From inside you can hear every pebble roll under the waves.'),
  hobby('writing', 'Writing fiction', 'Keep talking. That would make a perfect opening line.', 'My detective solves mysteries in a laundromat. I finished chapter four waiting for my socks to dry.'),
  hobby('martial-arts', 'Martial arts', 'My oldest belt is rolled up beside my newest one.', 'I practice forms with the friend who took the first class with me. We still bow to each other in the grocery aisle.'),
  hobby('running', 'Distance running', 'My favorite route smells like cinnamon halfway through.', 'I go out early enough to catch the baker opening the shutters. We wave on the way out and on the way home.'),
  hobby('theater', 'Community theater', 'I can recite the whole scene from behind the curtain.', 'My first part was a tree. When the lead forgot a line, our forest whispered the entire speech.'),
  hobby('band', 'Playing in a band', 'We keep the set list taped to an old suitcase.', 'Our rehearsal room has exactly one good outlet. We worked out an acoustic encore for when the fuse goes.'),
] as const;

export const womensHobbies = [
  hobby('figure-modeling', 'Figure modeling', 'My stillest pose involves a crooked wooden stool.', 'I model for a life-drawing class. Twelve artists drew the same pose and gave me twelve different moods.'),
  hobby('nail-art', 'Painting nails', 'I can draw a daisy with the head of a pin.', 'I painted a different tiny constellation on each fingernail. Link my pinkies and you get the summer sky.', 'My sandals finally show off the little checkerboards on my toenails. The smallest squares took two tries.'),
];

export const localHobbies: Record<NationalityId, Hobby> = {
  USA: hobby('quilting', 'Quilting bees', 'That little square used to be a work shirt.', 'Our quilting circle traded scraps. I can point to six neighbors on one blanket.'),
  CAN: hobby('curling', 'Curling', 'I have a broom you cannot borrow for the kitchen.', 'On Friday nights we curl with my aunt. She can call a shot all the way from the warming room.'),
  JPN: hobby('onsen', 'Onsen visits', 'My towel stayed dry even when it started to snow.', 'I tie up my hair and leave my towel on the stone. From the outdoor spring you can hear snow slide off the pines.'),
  KOR: hobby('baduk', 'Playing baduk', 'Listen to the click of this little stone.', 'Grandpa gave me his old baduk board. We replay one corner of our last game over breakfast.'),
  MEX: hobby('papel-picado', 'Papel picado', 'Unfold this carefully. The little birds share a wing.', 'I cut birds into folded tissue paper for our courtyard. In the breeze the whole flock lifts off together.'),
  DOM: hobby('dominoes', 'Domino evenings', 'That sharp clack means someone finally found the double.', 'My neighbors bring their own folding chairs. We argue over dominoes until the porch light comes on.'),
  PRI: hobby('cuatro', 'Playing the cuatro', 'That little instrument has a surprisingly big voice.', 'I play my cuatro on the porch. My cousin can name the tune from the first three notes and usually joins on the fourth.'),
  BRA: hobby('choro', 'Choro music circles', 'Leave a chair in the circle for me.', 'I practice the choro melody slowly at home. In the circle everyone grins when I finally catch the turn.'),
  ARG: hobby('milonga', 'Tango nights', 'My good shoes live in a cloth bag.', 'At the neighborhood milonga my favorite partner is the one who waits for the little pause in the music.'),
  AUS: hobby('beach-cricket', 'Beach cricket', 'Two beach bags make decent stumps.', 'The tide erased the crease three times. We played the whole afternoon anyway.'),
  IRL: hobby('trad-session', 'Traditional music sessions', 'I have the B part of the reel stuck in my head.', 'I learned the tune by ear at a session. The first night I could play both parts, somebody slid me a chair.'),
  ITA: hobby('bocce', 'Bocce', 'I am aiming for the smallest ball on the court.', 'My uncle measures the close calls with a bit of string. He keeps it in a velvet box like a crown jewel.'),
  TPE: hobby('glove-puppets', 'Glove puppetry', 'The tiny silk sleeve is for my loudest character.', 'My puppet announces every entrance with a spin. The neighborhood kids have started doing it when I walk in.'),
  NED: hobby('cycle-touring', 'Cycle touring', 'My best maps have grease stains.', 'We ride out along the canal and take a different bridge home. A headwind earns an extra bakery stop.'),
  CUB: hobby('son', 'Playing son', 'Leave me a little room beside the guitar.', 'When the neighbors play son I bring the claves. My first pair still lives in my coat pocket.'),
  VEN: hobby('arepas', 'Making arepas', 'My apron has a neat round patch of flour.', 'Sunday is the great arepa filling vote. My family takes the ballots much more seriously than the final count.'),
  CHN: hobby('paper-cutting', 'Paper cutting', 'Hold the red paper up to the window.', 'I made a fish for our front window. The crooked tail makes a lovely shadow when the sun comes through.'),
  PAN: hobby('pollera', 'Pollera embroidery', 'I am saving this thread for a particular flower.', 'My aunt let me embroider one flower for her pollera. I can pick it out when she turns on the dance floor.'),
  COL: hobby('vallenato', 'Vallenato accordion', 'The bellows have a patch the color of the sky.', 'I learned a vallenato tune for my cousin. The tricky part was keeping it a surprise in our little apartment.'),
  ISR: hobby('folk-dance', 'Folk dancing', 'Leave a gap in the circle for a late arrival.', 'I joined the neighborhood folk dance to learn one song. Now I am the one pulling out extra chairs.'),
  CZE: hobby('marionettes', 'Marionette theater', 'My dragon travels in a shoebox.', 'I carved a marionette dragon with a movable jaw. Opening night it swallowed the curtain and got the biggest laugh.'),
  GBR: hobby('bell-ringing', 'Bell ringing', 'I can hear our practice from the end of the street.', 'We meet in the tower on Tuesdays. The first time I got the whole change right, I missed the bus smiling.'),
  NCA: hobby('marimba', 'Playing marimba', 'Pass me the mallets with the worn handles.', 'My neighbor taught me the melody on the marimba. We share one instrument and bump elbows at the best part.'),
  RSA: hobby('beadwork', 'Beadwork', 'That tiny pattern took an entire rainy evening.', 'My cousin and I make beaded bracelets in pairs. Mine always has one odd bead so I know which one is hers.'),
  ESP: hobby('fan-painting', 'Painting folding fans', 'The picture disappears when I close my hand.', 'I painted a swallow on a folding fan. Open it slowly and it looks like the bird is stretching its wings.'),
};
