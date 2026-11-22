# Painted field players

Design Lab and Game Day build each player from the same library of PNGs. `paintedLook.ts` maps a player's saved traits, field role and camera direction to two sheets. Identity affects hair, face details, build and stature. The club supplies the colors worn on the field.

## Drawing a new pose

Each sheet uses four columns of 256 × 256 pixel cells and three rows of artwork. Heads register at the chin at (128, 200). Bodies register at the soles at y = 249. A second grid below the artwork stores the skin mask in alpha and the painted light level in grayscale. Both head and body sample the athlete’s skin palette. This keeps the jersey, mitt and cleats independently colored.

In `anchors.json`, each body cell records four coordinates in pixels from its top left. The first pair marks the collar where the head attaches. The second places the baseball at the throwing hand, receiving pocket or bat barrel for that action. `faceMarks.json` registers the eye centers, both corners of the upper lip, the lower lip, the jaw contour and each exposed earlobe or hair tie in the painted cell. Cosmetic ink is sampled at the same texture coordinates as the face, including during a lean or mirror.

Draw both camera views for right-handed play. The throwing hand is on the viewer's left from the front and right from behind. Batters set up with the bat over their right shoulder and the helmet flap on their left ear. The rig mirrors the art and contact coordinates for lefties and keeps jersey lettering readable.

Review a new set in **Design Lab**. Watch a pitch in **Mound close-up** and **Pitcher OTS 3D**, then switch throwing hand and club colors. Check the cap crown, chin-to-collar join, glove pocket and the ball at release in each view. For catcher art, check that the glove stays on the same hand from crouch to receive.

Each delivery cel includes the jersey, both sleeves, both arms, hands, glove, waistband and cleats in one connected painting. The registered finger pads follow the world-space ball through release. Keep jersey shadows out of the skin recoloring mask. Review the set, hand separation, release and deceleration using a dark skin tone as well as a light one.

Pitchers gather with the glove at their chest, balance on their throwing-side foot and lift the opposite knee. Check both camera views at hand break and release. The rear baseball peeks below the back of the hand. The infield stretch and overhead catch use separate, planted receiving poses.

In the box, the torso and cleats face across the plate while the helmet turns toward the mound. On base, runners watch home. During a sprint, the next bag determines their heading.
