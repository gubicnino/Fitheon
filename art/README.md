# Fitheon art: machine and art choices

Decided by Nino on 2026-11-14. **These choices are not yet in the spec
(`dokumentacija/Fitheon-Specification-v2.md`) or in `packages/catalog`.** They
change rules, so the spec, the catalog and its tests are updated together in
one change.

## Slots

- **No slot categories.** Any machine can be placed in any slot. The player
  chooses what goes where.
- Decor items can go in any slot too. *(Assumed; not yet confirmed by Nino.)*

## Machines

Each machine starts at one quality tier and can be upgraded from there up to
Elite.

| Starts at | Machines |
|---|---|
| Basic | Squat rack, Bench press, Adjustable bench, Dumbbell rack, Exercise bike, Calisthenics bar |
| Standard | Cable machine, Pec deck, Leg extension, Leg curl, Smith machine, Rowing machine, Hack squat, Leg press, Treadmill |
| Commercial | Pendulum squat, Stair master |
| Elite | None for now |

Decor (single quality): Plant, Wall TV, Sofa, Lockers, Reception desk. *(Kept
from the current catalog; Nino has not asked to change it.)*

## How tiers look

Two cues together, so tiers can be told apart on a small sprite and without
relying on colour alone.

| Tier | Colour | Base under the machine |
|---|---|---|
| Basic | Bare grey steel, black pads | None |
| Standard | Dark frame, blue pads | Rubber mat |
| Commercial | Light frame, orange accents | Raised platform |
| Elite | Matte black with purple and a bright trim | Lit platform: a bright purple floor panel with a pale trim line, set in a dark purple two-step surround |

The colours follow the quality colours the app already uses for its quality
tags (grey, blue, orange, purple).

## Machines that change shape

A tier normally changes only the colour and the base. A change of model
happens **only at Elite, and only for some machines**. Two are built now,
plus the two exceptions below:

| Machine | Basic | Standard | Commercial | Elite |
|---|---|---|---|---|
| Bench press | Bench press | Bench press | Bench press | Lay-down chest press machine (plate-loaded, lever arms over a flat bench) |
| Calisthenics bar | A single pull-up bar | A station with a few more bars | The same station | A full calisthenics cube rig (square posts, bars across at several heights) |
| Dumbbell rack | One shelf, 4 dumbbells | One shelf, 6 dumbbells | One shelf, 8 dumbbells | Two shelves, 16 dumbbells |

The dumbbell rack is an exception to "only at Elite" (Nino, 2026-11-15): it
holds more dumbbells at every tier and the rack grows longer with them.

The calisthenics line is the other exception: Nino wants a
middle stage with a few more bars. *Which tier the middle stage starts at
(Standard, as written here, or Commercial) is my assumption.*

Reference pictures for the chest press machine, the cube rig and the pendulum
squat were used to build the models on 2026-11-15 and then removed from the
repo; they were manufacturers' product photos.

**Later, after the full release:** more machines changing shape at Elite. Not
planned in detail.

## Where the models come from

The pack is the free "Low Poly Gym Set" by VNB (Leo):
`https://vnbp.itch.io/low-poly-gym-set`, the "standard Zip, separated FBX"
download. It is unpacked into `art/pack/` and committed (Nino's decision,
2026-11-15).

Licence: the itch.io page lists Creative Commons Attribution 4.0. The author
allows commercial and non-commercial use and forbids reselling or republishing
the models, alone or in a pack. The README credits VNB (Leo). The GitHub repo
is public, so pushing the pack makes it downloadable there.

### What the pack covers

Checked on 2026-11-15 by importing all 72 FBX files into Blender 5.3 and
rendering each one. Every file imports without errors, is low-poly (14 to 586
faces), has UVs and stands on the floor. The texture paths stored in the files
do not resolve, so each import must relink its images to `art/pack/Textures/`.

| Machine | In the pack | From which files |
|---|---|---|
| Squat rack | Yes, assembled from parts | `Weight_Stand_3` (a squat stand with bar hooks), `Barbell_1`, `Weight_A`–`C` |
| Bench press | Yes | `Bench_Press` |
| Adjustable bench | Yes | `Bench_C`, `Bench_D` (`Bench_A`/`B` are flat benches) |
| Dumbbell rack | Yes, but not used | `Barbell_Stand_2`, `Dumbbells_1`, `Dumbbells_2`. Replaced on 2026-11-15 by our own racks (see Machines we built): Nino did not like the look, and the pack's dumbbells did not sit on the rack or take the tier colours |
| Exercise bike | Yes, assembled from parts | `Exercise_Bike`, `Exercise_Bike_Pedal_A`/`B`, `Exercise_Bike_Seat` |
| Calisthenics bar, stage 1 | Yes | `Pullup_Stand` (two posts), `Pullup_Bar` |
| Calisthenics bar, stage 2 | Yes | `Pullup_Stand_2` (a frame with pegs), `Pullup_Bar` |
| Cable machine | Yes | `E_Machine_1` or `E_Machine_2` (a pulldown tower with a bench), `PullDown_Ac_1`/`2` |
| Pec deck | Yes, assembled from parts | `E_Machine_3` or `E_Machine_4` (seated body), `PecDeck_Ac_1`/`2`, `Pec_Machine_Ac_1`/`2`. Not yet assembled. |
| Smith machine | Yes | `Sm_Machine` (a four-post cage with a bar) |
| Rowing machine | Yes | `Stationary_Rowing_Machine` and its two parts |
| Treadmill | Yes, two models | `Treadmill_1_Main`, `Treadmill_2_Main`, `Treadmill_R` |
| Decor: plant, wall TV, sofa, lockers, reception desk | Yes | `Plant_Deco`, `Mounted_TV`, `Sofa_1`–`3`, `Drawer_1`/`2`/`D`, `Desk_1`–`3` |

File names that mislead: `Barbell_Stand_1` is a vertical storage rack for
barbells, `Weight_Stand_1`/`2` are plate trees, `Weight_D` is a block and not
a plate, and `Flat_Bench` is an aerobic step.

Also in the pack and unused so far: `Kettlebell`, `EzBar`, `Sp_Mat_1`/`2`
(floor mats, useful for the Standard tier's base), paintings, tables, a PC.

### Colours

Every model is UV-mapped to single cells of a 12x12 palette image. The pack's
four palettes (`Textures/palette1.png` to `palette4.png`) differ in **one**
cell only, the pad colour: red, blue, green, dark grey. Frames stay the same.
So the pack's palettes cannot produce the four tier looks above. The tiers
use four palette images of our own, `version1/tiers/palette_<tier>.png`, written
by `scripts/build_previews.py`. They change the frame, pad and trim cells and
add three cells for the base under the machine.

### Previews

`scripts/build_previews.py` assembles the pack's parts into whole machines,
applies the tier palettes and bases, and renders:

- `version1/previews/equipment.png`: all 17 machines, the six models that
  replace one at a higher tier, and the five decor items.
- `version1/previews/tiers_1.png` to `tiers_3.png`: every machine in every
  tier it can have.

The renders use Blender's Standard view transform; the default (AgX) greyed
the tier colours.

Known gaps in this first pass:

- Weight plates use the pack's `base_textures.png`, not the palette, so they
  keep their colour in every tier.
- The Elite floor is "lit" by colour only; the preview renderer has no light
  emission.
- Machines with no pads (Smith machine, treadmill, squat rack) differ between
  Standard and Elite only by a darker frame and the base.
- At Elite, the "bright trim" is gold on the bare-steel cells. On some pack
  models those cells cover large parts (the rowing rail).
- The exercise bike has no pedals; the pack's pedal parts are not placed yet.
- The pec deck, cable machine and rowing machine parts were placed by
  measuring, not from the author's assembled scene.

### Machines we built

Eight machines the pack lacks, and four dumbbell racks that replace the
pack's, were built by script on 2026-11-15, in the
pack's style and on the same palette cells, so one palette swap recolours
pack models and ours alike.

| Machine | Model | Based on |
|---|---|---|
| Leg extension | `Leg_Extension` | General knowledge |
| Leg curl (lying) | `Leg_Curl` | General knowledge |
| Hack squat | `Hack_Squat` | General knowledge |
| Leg press (45 degree sled) | `Leg_Press` | General knowledge |
| Stair master | `Stair_Master` | General knowledge |
| Pendulum squat | `Pendulum_Squat` | A reference picture |
| Lay-down chest press (Elite bench press) | `Laydown_Chest_Press` | A reference picture |
| Calisthenics cube rig (Elite) | `Calisthenics_Cube` | A reference picture |
| Dumbbell rack, one per tier | `Dumbbell_Rack_Basic`, `_Standard`, `_Commercial`, `_Elite` | General knowledge. Hex dumbbells lie across two rails with a front lip; the end caps take the tier colour |

- `scripts/build_machines.py` is the source. Run it in Blender to rebuild
  everything; change a machine by editing its function.
- `version1/fitheon_machines.blend` holds all twelve and `version1/fbx/` one FBX
  each. `version1/preview.png` shows the first eight from two sides; it was
  rendered by hand before the racks existed.
- The models carry no brand names or logos from the reference pictures.
- These files are our own work and are committed. They reference the pack's
  palette image by path and do not contain it.

## The version1 folder

`art/version1/` holds everything the game uses in this first version of the
art, so nothing else in `art/` is needed to build sprites:

| Folder | Contents |
|---|---|
| `fbx/` | The twelve models we built |
| `pack/FBX/` | Copies of the 25 pack models the assemblies use |
| `pack/Textures/` | Copies of the three textures those models use, and `pack/ReadMe.txt` |
| `tiers/` | The four tier palettes |
| `previews/` | The equipment sheet and the three tier sheets |

The scripts still read the pack from `art/pack/` and refresh the copies on
every run of `build_previews.py`.

## Open points

- Nino to look over `version1/previews/` and say what else to change in the
  tier colours, the bases and the assembled machines (see Known gaps).
- Unlock levels and size classes for the new and moved machines.
- Camera angle and sprite size, decided on the phone in the render test.
