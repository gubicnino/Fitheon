"""Renders preview sheets of every piece of Fitheon equipment and of every tier.

Run inside Blender after the pack is unpacked into art/pack/. It assembles the
pack's separate parts into whole machines, adds the machines from
build_machines.py, writes the four tier palettes to art/version1/tiers/ and renders:

  art/version1/previews/equipment.png   everything we use, once
  art/version1/previews/tiers_N.png     each machine in each tier it can have

The tier look is two cues (see art/README.md): a palette swap, and a base
under the machine (none, rubber mat, raised platform, lit platform).
"""
import math
import os

import bpy
import numpy as np
from mathutils import Matrix, Vector

ART = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) if "__file__" in globals() else r"C:\Users\gubic\Code\Fitheon\art"
PACK_FBX = os.path.join(ART, "pack", "FBX")
PACK_TEX = os.path.join(ART, "pack", "Textures")
VERSION = os.path.join(ART, "version1")  # everything the game uses, in one folder
TIER_DIR = os.path.join(VERSION, "tiers")
OUT = os.path.join(VERSION, "previews")
CELL = 384
VIEW = (1.0, -1.25, 0.8)

_ns = {"__name__": "build_machines"}
exec(open(os.path.join(ART, "scripts", "build_machines.py")).read(), _ns)
Builder = _ns["Builder"]
FRAME, BLACK, ACCENT, GREY, LIGHT, STEEL = (_ns[k] for k in ("FRAME", "BLACK", "ACCENT", "GREY", "LIGHT", "STEEL"))
BASE_TOP, BASE_EDGE = (10, 0), (11, 0)  # palette cells no model uses; checked in tier_palettes()

TIERS = ["Basic", "Standard", "Commercial", "Elite"]
# Colours per tier, sRGB 0..1. Accents follow the app's quality colours (q1..q4 in ui/tokens.js).
TIER_COLOURS = [
    {FRAME: (.50, .52, .55), GREY: (.62, .64, .67), ACCENT: (.09, .09, .10)},
    {FRAME: (.13, .14, .16), GREY: (.30, .32, .35), ACCENT: (.22, .47, .98),
     BASE_TOP: (.15, .16, .18), BASE_EDGE: (.15, .16, .18)},
    {FRAME: (.87, .88, .90), GREY: (.74, .76, .79), ACCENT: (1.0, .45, .20),
     BASE_TOP: (.60, .62, .65), BASE_EDGE: (1.0, .45, .20)},
    {FRAME: (.05, .05, .06), GREY: (.12, .12, .14), ACCENT: (.62, .40, 1.0),
     LIGHT: (1.0, .80, .30), STEEL: (1.0, .86, .45),
     BASE_TOP: (.09, .09, .11), BASE_EDGE: (.86, .72, 1.0)},
]


def plates(x, y, z, kind="Weight_B", n=2):
    """Plates on both ends of a bar that runs along X."""
    return [(kind, (s * (x + i * 0.07), y, z)) for s in (1, -1) for i in range(n)]


def cable(b):
    b.rod((0, -0.17, 2.05), (0, -0.17, 1.78), r=0.008, col=BLACK, seg=6)


# Each assembly is a list of parts: (model, location, turn about Z in degrees, scale).
# "gen:<Name>" is a machine from build_machines.py; a function draws extra geometry.
ASSEMBLIES = {
    "squat_rack": [("Weight_Stand_3", (0, 0, 0)), ("Barbell_1", (0, 0.33, 1.3))] + plates(0.72, 0.33, 1.3),
    "bench_press": [("Bench_Press", (0, 0, 0)), ("Barbell_1", (0, 0.2, 0.97))] + plates(0.72, 0.2, 0.97),
    "adjustable_bench": [("Bench_D", (0, 0, 0))],
    "dumbbell_rack": [("Barbell_Stand_2", (0, 0, 0))]
    + [("Dumbbells_1", (x, -0.2, 0.81), 90) for x in (-0.7, -0.35, 0, 0.35, 0.7)]
    + [("Dumbbells_2", (x, 0.19, 1.09), 90) for x in (-0.66, -0.22, 0.22, 0.66)],
    "exercise_bike": [("Exercise_Bike", (0, 0, 0)), ("Exercise_Bike_Seat", (0, 0, 0))],
    "calisthenics_1": [("Pullup_Stand", (0, 0, 0)), ("Pullup_Bar", (0, 0, 2.78))],
    "calisthenics_2": [("Pullup_Stand", (0, 0, 0)), ("Pullup_Bar", (0, 0, 2.78)), ("Pullup_Bar", (0, 0, 2.1)),
                       ("Pullup_Stand_2", (0.94, 0.62, 0), 90), ("Pullup_Stand_2", (-0.94, 0.62, 0), 90)],
    "calisthenics_cube": [("gen:Calisthenics_Cube", (0, 0, 0))],
    "cable_machine": [("E_Machine_2", (0, 0, 0)), ("PullDown_Ac_1", (0, -0.17, 1.78)), cable],
    "pec_deck": [("E_Machine_4", (0, 0, 0)), ("Pec_Machine_Ac_1", (0, 0, 0)),
                 ("PecDeck_Ac_1", (0.1, -0.03, 1.57)), ("PecDeck_Ac_1", (-0.1, -0.03, 1.57), 180)],
    "smith_machine": [("Sm_Machine", (0, 0, 0))],
    "rowing_machine": [("Stationary_Rowing_Machine", (0, 0, 0)), ("Stationary_Rowing_Machine_Seat", (0, 0.35, 0.6)),
                       ("Stationary_Rowing_Machine_A", (0, -0.42, 0.64))],
    "treadmill": [("Treadmill_1_Main", (0, 0, 0))],
    "laydown_chest_press": [("gen:Laydown_Chest_Press", (0, 0, 0))],
    "leg_extension": [("gen:Leg_Extension", (0, 0, 0))],
    "leg_curl": [("gen:Leg_Curl", (0, 0, 0))],
    "hack_squat": [("gen:Hack_Squat", (0, 0, 0))],
    "leg_press": [("gen:Leg_Press", (0, 0, 0))],
    "pendulum_squat": [("gen:Pendulum_Squat", (0, 0, 0))],
    "stair_master": [("gen:Stair_Master", (0, 0, 0))],
    "plant": [("Plant_Deco", (0, 0, 0), 0, 3.0)],
    "wall_tv": [("Mounted_TV", (0, 0, 0.36))],
    "sofa": [("Sofa_1", (0, 0, 0))],
    "lockers": [("Drawer_2", (x, 0, 0)) for x in (-0.41, 0, 0.41)],
    "reception_desk": [("Desk_1", (0, 0, 0))],
}

# (label, first tier, assembly, {tier: other assembly}) in catalogue order.
MACHINES = [
    ("Squat rack", 0, "squat_rack", {}),
    ("Bench press", 0, "bench_press", {3: "laydown_chest_press"}),
    ("Adjustable bench", 0, "adjustable_bench", {}),
    ("Dumbbell rack", 0, "dumbbell_rack", {}),
    ("Exercise bike", 0, "exercise_bike", {}),
    ("Calisthenics bar", 0, "calisthenics_1", {1: "calisthenics_2", 2: "calisthenics_2", 3: "calisthenics_cube"}),
    ("Cable machine", 1, "cable_machine", {}),
    ("Pec deck", 1, "pec_deck", {}),
    ("Leg extension", 1, "leg_extension", {}),
    ("Leg curl", 1, "leg_curl", {}),
    ("Smith machine", 1, "smith_machine", {}),
    ("Rowing machine", 1, "rowing_machine", {}),
    ("Hack squat", 1, "hack_squat", {}),
    ("Leg press", 1, "leg_press", {}),
    ("Treadmill", 1, "treadmill", {}),
    ("Pendulum squat", 2, "pendulum_squat", {}),
    ("Stair master", 2, "stair_master", {}),
]
DECOR = [("Plant", "plant"), ("Wall TV", "wall_tv"), ("Sofa", "sofa"), ("Lockers", "lockers"),
         ("Reception desk", "reception_desk")]


class Stage:
    """A scratch scene that shows one assembly at a time."""

    def __init__(self):
        old = bpy.data.scenes.get("Preview")
        if old:
            for ob in list(old.collection.objects):
                bpy.data.objects.remove(ob, do_unlink=True)
        self.scene = old or bpy.data.scenes.new("Preview")
        bpy.context.window.scene = self.scene
        self._render_settings()
        self.templates = {}
        self.assemblies = {}
        generated = _ns["build_all"]()[1]
        self.generated = {ob.name: ob.data for ob in generated}
        self.palette = bpy.data.images.load(os.path.join(PACK_TEX, "palette1.png"), check_existing=True)
        self.palette.reload()
        self.original = self._pixels()
        self.own_material = _ns["palette_material"]()

    def _render_settings(self):
        sc = self.scene
        sc.render.engine = 'BLENDER_WORKBENCH'
        sh = sc.display.shading
        sh.light, sh.color_type = 'STUDIO', 'TEXTURE'
        sh.show_shadows, sh.show_cavity, sh.show_object_outline = False, True, True
        sc.render.resolution_x = sc.render.resolution_y = CELL
        sc.render.resolution_percentage = 100
        sc.render.image_settings.file_format = 'PNG'
        sc.world = sc.world or bpy.data.worlds.new("PreviewWorld")
        sc.world.color = (0.82, 0.84, 0.87)
        cam = bpy.data.objects.new("PreviewCam", bpy.data.cameras.new("PreviewCam"))
        cam.data.type, cam.data.clip_end = 'ORTHO', 300
        sc.collection.objects.link(cam)
        sc.camera = self.cam = cam

    def _pixels(self):
        w, h = self.palette.size
        px = np.empty(w * h * 4, dtype=np.float32)
        self.palette.pixels.foreach_get(px)
        return px.reshape(h, w, 4)

    def _template(self, name):
        if name not in self.templates:
            if name.startswith("gen:"):
                ob = bpy.data.objects.new(name, self.generated[name[4:]])
            else:
                before = set(bpy.data.objects)
                bpy.ops.import_scene.fbx(filepath=os.path.join(PACK_FBX, name + ".fbx"))
                ob = next(o for o in bpy.data.objects if o not in before)
                for coll in list(ob.users_collection):
                    coll.objects.unlink(ob)
                self._relink_images()
            self.templates[name] = ob
        return self.templates[name]

    def _relink_images(self):
        """Point every material at one shared palette image, and fix the pack's broken texture paths."""
        for mat in bpy.data.materials:
            if not mat.node_tree:
                continue
            for node in mat.node_tree.nodes:
                if node.type != 'TEX_IMAGE' or not node.image:
                    continue
                base = os.path.basename(node.image.filepath.replace("\\", "/"))
                if base == "palette1.png":
                    node.image = self.palette
                elif node.image.source == 'FILE' and os.path.exists(os.path.join(PACK_TEX, base)):
                    node.image.filepath = os.path.join(PACK_TEX, base)

    def assembly(self, key):
        """Builds the assembly once. Returns its root empty."""
        if key in self.assemblies:
            return self.assemblies[key]
        root = bpy.data.objects.new(key, None)
        self.scene.collection.objects.link(root)
        extra = Builder()
        has_extra = False
        for part in ASSEMBLIES[key]:
            if callable(part):
                part(extra)
                has_extra = True
                continue
            name, loc = part[:2]
            turn = part[2] if len(part) > 2 else 0
            scale = part[3] if len(part) > 3 else 1.0
            tpl = self._template(name)
            ob = tpl.copy()
            ob.matrix_basis = (Matrix.Translation(loc) @ Matrix.Rotation(math.radians(turn), 4, 'Z')
                               @ Matrix.Scale(scale, 4) @ tpl.matrix_basis)
            self.scene.collection.objects.link(ob)
            ob.parent = root
        if has_extra:
            mesh = extra.finish(key + "_extra")
            mesh.materials.append(self.own_material)
            ob = bpy.data.objects.new(key + "_extra", mesh)
            self.scene.collection.objects.link(ob)
            ob.parent = root
        self._show(root, False)
        self.assemblies[key] = root
        return root

    @staticmethod
    def _show(root, visible):
        for ob in root.children:
            ob.hide_render = not visible

    def set_tier(self, tier):
        """tier is 0..3, or None for the pack's own colours."""
        px = self.original.copy()
        if tier is not None:
            for (x, y), rgb in TIER_COLOURS[tier].items():
                px[y, x, :3] = rgb
        self.palette.pixels.foreach_set(px.ravel())
        self.palette.update()
        return px

    def _base(self, mn, mx, tier):
        """The tier's base under a footprint. Returns (object or None, height)."""
        if not tier:
            return None, 0.0
        margin = 0.14
        cx, cy = (mn.x + mx.x) / 2, (mn.y + mx.y) / 2
        sx, sy = mx.x - mn.x + 2 * margin, mx.y - mn.y + 2 * margin
        b = Builder()
        if tier == 1:
            height = 0.03
            b.box((cx, cy, height / 2), (sx, sy, height), col=BASE_TOP)
        else:
            height = 0.11
            b.box((cx, cy, 0.02), (sx + 0.12, sy + 0.12, 0.04), col=BASE_EDGE)
            b.box((cx, cy, 0.075), (sx, sy, 0.07), col=BASE_TOP)
        mesh = b.finish("base")
        mesh.materials.append(self.own_material)
        ob = bpy.data.objects.new("base", mesh)
        self.scene.collection.objects.link(ob)
        return ob, height

    def render(self, key, tier, label, path):
        root = self.assembly(key)
        root.location.z = 0
        self._show(root, True)
        bpy.context.view_layer.update()
        mn, mx = bounds(root.children)
        base, height = self._base(mn, mx, tier)
        root.location.z = height
        self.set_tier(tier)
        bpy.context.view_layer.update()
        objs = list(root.children) + ([base] if base else [])
        mn, mx = bounds(objs)
        center, radius = (mn + mx) / 2, max((mx - mn).length / 2, 0.05)
        d = Vector(VIEW).normalized()
        self.cam.location = center + d * 60
        self.cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
        self.cam.data.ortho_scale = radius * 2.5
        text = self._label(label, center, radius)
        self.scene.render.filepath = path
        bpy.ops.render.render(write_still=True, scene=self.scene.name)
        for ob in (text, base):
            if ob:
                data = ob.data
                bpy.data.objects.remove(ob, do_unlink=True)
                (bpy.data.curves if isinstance(data, bpy.types.Curve) else bpy.data.meshes).remove(data)
        self._show(root, False)

    def _label(self, text, center, radius):
        cu = bpy.data.curves.new("label", 'FONT')
        cu.body, cu.align_x, cu.size = text, 'CENTER', radius * 0.15
        mat = bpy.data.materials.get("label_black") or bpy.data.materials.new("label_black")
        mat.diffuse_color = (0, 0, 0, 1)
        cu.materials.append(mat)
        ob = bpy.data.objects.new("label", cu)
        self.scene.collection.objects.link(ob)
        rot = self.cam.rotation_euler.to_matrix()
        ob.rotation_euler = self.cam.rotation_euler
        ob.location = center - rot @ Vector((0, 1, 0)) * radius * 1.14 + rot @ Vector((0, 0, 1)) * 30
        return ob


def bounds(objs):
    mn, mx = Vector((1e9,) * 3), Vector((-1e9,) * 3)
    for ob in objs:
        if ob.type != 'MESH':
            continue
        for corner in ob.bound_box:
            w = ob.matrix_world @ Vector(corner)
            mn, mx = Vector(map(min, mn, w)), Vector(map(max, mx, w))
    return mn, mx


def compose(cells, out, cols):
    """Pastes cell images (or None for an empty cell) into one sheet, row by row."""
    rows = math.ceil(len(cells) / cols)
    sheet = None
    for i, path in enumerate(cells):
        if path is None:
            continue
        img = bpy.data.images.load(path)
        px = np.empty(CELL * CELL * 4, dtype=np.float32)
        img.pixels.foreach_get(px)
        px = px.reshape(CELL, CELL, 4)
        bpy.data.images.remove(img)
        os.remove(path)
        if sheet is None:
            sheet = np.empty((rows * CELL, cols * CELL, 4), dtype=np.float32)
            sheet[:] = px[0, 0]
        r, c = divmod(i, cols)
        y0 = (rows - 1 - r) * CELL
        sheet[y0:y0 + CELL, c * CELL:(c + 1) * CELL] = px
    img = bpy.data.images.new("sheet", cols * CELL, rows * CELL, alpha=True)
    img.pixels.foreach_set(sheet.ravel())
    img.filepath_raw, img.file_format = out, 'PNG'
    img.save()
    bpy.data.images.remove(img)


def tier_palettes(stage):
    """Writes the four tier palettes next to the pack's own, which they derive from."""
    os.makedirs(TIER_DIR, exist_ok=True)
    used = set()
    for tpl in stage.templates.values():
        uv = tpl.data.uv_layers.active.data
        for loop in uv:
            used.add((min(int(loop.uv[0] * 12), 11), min(int(loop.uv[1] * 12), 11)))
    clash = used & {BASE_TOP, BASE_EDGE}
    if clash:
        raise RuntimeError(f"base palette cells are used by a model: {clash}")
    for i, name in enumerate(TIERS):
        px = stage.set_tier(i)
        img = bpy.data.images.new("tier", 12, 12, alpha=True)
        img.pixels.foreach_set(px.ravel())
        img.filepath_raw, img.file_format = os.path.join(TIER_DIR, f"palette_{name.lower()}.png"), 'PNG'
        img.save()
        bpy.data.images.remove(img)
    stage.set_tier(None)


def equipment_sheet(stage):
    cells = []

    def add(label, key, tier):
        path = os.path.join(OUT, f"_cell_{len(cells)}.png")
        stage.render(key, tier, label, path)
        cells.append(path)

    for label, first, key, variants in MACHINES:
        add(label, key, first)
        seen = {key}
        for tier in sorted(variants):
            if variants[tier] not in seen:
                seen.add(variants[tier])
                add(f"{label} ({TIERS[tier]})", variants[tier], tier)
    for label, key in DECOR:
        add(label, key, None)
    compose(cells, os.path.join(OUT, "equipment.png"), cols=5)
    return len(cells)


def tier_sheets(stage, rows_per_sheet=6):
    files = []
    for start in range(0, len(MACHINES), rows_per_sheet):
        cells = []
        for label, first, key, variants in MACHINES[start:start + rows_per_sheet]:
            for tier, tier_name in enumerate(TIERS):
                if tier < first:
                    cells.append(None)
                    continue
                path = os.path.join(OUT, f"_cell_{len(cells)}.png")
                stage.render(variants.get(tier, key), tier, f"{label} - {tier_name}", path)
                cells.append(path)
        out = os.path.join(OUT, f"tiers_{start // rows_per_sheet + 1}.png")
        compose(cells, out, cols=4)
        files.append(out)
    return files


def main(sheets=("equipment", "tiers")):
    os.makedirs(OUT, exist_ok=True)
    stage = Stage()
    for key in ASSEMBLIES:
        stage.assembly(key)
    tier_palettes(stage)
    done = {}
    if "equipment" in sheets:
        done["equipment"] = equipment_sheet(stage)
    if "tiers" in sheets:
        done["tiers"] = tier_sheets(stage)
    stage.set_tier(None)
    return done


if __name__ == "__main__":
    main()
