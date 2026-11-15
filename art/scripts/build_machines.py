"""Builds the Fitheon machines that the VNB gym pack does not contain.

Run inside Blender (Scripting tab, or `blender --python art/scripts/build_machines.py`).
It creates one mesh per machine in a scene called "Machines" and writes
art/generated/fitheon_machines.blend plus one FBX per machine.

Every face is UV-mapped to one cell of the pack's 12x12 palette texture, the
same cells the pack's own models use. Swapping the palette image therefore
recolours pack models and these models alike.

Axes: X is width, Y is length with the tower or head end at +Y, Z is up.
Units are metres and every model stands on Z = 0.
"""
import math
import os

import bmesh
import bpy
from mathutils import Matrix, Vector

ART = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) if "__file__" in globals() else r"C:\Users\gubic\Code\Fitheon\art"
PALETTE = os.path.join(ART, "pack", "Textures", "palette1.png")
OUT = os.path.join(ART, "generated")
PALETTE_CELLS = 12

# Palette cells (column, row from the bottom) as used by the pack's models.
FRAME = (1, 11)   # dark frame
BLACK = (2, 11)   # rubber, plates
ACCENT = (4, 11)  # pads; the only colour the pack's four palettes change
GREY = (2, 10)    # mid grey metal
LIGHT = (1, 10)   # light grey metal
STEEL = (1, 9)    # bare steel
SCREEN = (0, 9)   # display glass

TUBE = 0.08       # default frame tube width
ROD = 0.02        # default bar radius
PLATE_R = 0.21
PLATE_T = 0.045


class Builder:
    """Collects boxes, tubes and rods into one low-poly mesh."""

    def __init__(self):
        self.bm = bmesh.new()
        self.uv = self.bm.loops.layers.uv.new("UVMap")

    def _paint(self, before, col, smooth=False):
        u = (col[0] + 0.5) / PALETTE_CELLS
        v = (col[1] + 0.5) / PALETTE_CELLS
        for f in self.bm.faces:
            if f in before:
                continue
            f.smooth = smooth and len(f.verts) == 4
            for loop in f.loops:
                loop[self.uv].uv = (u, v)

    def box(self, c, s, pitch=0.0, yaw=0.0, col=FRAME, bevel=0.0):
        """Box of size s centred on c. pitch turns about X (positive lifts the +Y end), yaw about Z."""
        before = set(self.bm.faces)
        m = (Matrix.Translation(Vector(c))
             @ Matrix.Rotation(math.radians(yaw), 4, 'Z')
             @ Matrix.Rotation(math.radians(pitch), 4, 'X')
             @ Matrix.Diagonal(Vector((*s, 1.0))))
        verts = bmesh.ops.create_cube(self.bm, size=1.0, matrix=m)["verts"]
        if bevel:
            edges = list({e for v in verts for e in v.link_edges})
            bmesh.ops.bevel(self.bm, geom=edges, offset=bevel, segments=1, affect='EDGES')
        self._paint(before, col)

    def tube(self, p1, p2, w=TUBE, h=None, col=FRAME):
        """Square tube from p1 to p2."""
        p1, p2 = Vector(p1), Vector(p2)
        d = p2 - p1
        before = set(self.bm.faces)
        m = (Matrix.Translation((p1 + p2) / 2)
             @ d.to_track_quat('Z', 'Y').to_matrix().to_4x4()
             @ Matrix.Diagonal(Vector((w, h or w, d.length, 1.0))))
        bmesh.ops.create_cube(self.bm, size=1.0, matrix=m)
        self._paint(before, col)

    def rod(self, p1, p2, r=ROD, col=STEEL, seg=8):
        """Round bar from p1 to p2."""
        p1, p2 = Vector(p1), Vector(p2)
        d = p2 - p1
        before = set(self.bm.faces)
        m = Matrix.Translation((p1 + p2) / 2) @ d.to_track_quat('Z', 'Y').to_matrix().to_4x4()
        bmesh.ops.create_cone(self.bm, cap_ends=True, segments=seg, radius1=r, radius2=r,
                              depth=d.length, matrix=m)
        self._paint(before, col, smooth=True)

    def plate(self, c, r=PLATE_R, t=PLATE_T, col=BLACK):
        """Weight plate on an X axis, with a light hub."""
        c = Vector(c)
        half = Vector((t / 2, 0, 0))
        self.rod(c - half, c + half, r=r, col=col, seg=12)
        self.rod(c - half * 1.3, c + half * 1.3, r=r * 0.28, col=LIGHT, seg=8)

    def finish(self, name):
        me = bpy.data.meshes.new(name)
        bmesh.ops.remove_doubles(self.bm, verts=self.bm.verts, dist=1e-5)
        for v in self.bm.verts:  # tilted tube ends dip a few millimetres under the floor
            v.co.z = max(v.co.z, 0.0)
        self.bm.to_mesh(me)
        self.bm.free()
        return me


def skids(b, x, y0, y1, cross=()):
    """Two floor rails along Y at +-x, joined by cross tubes at the given y values."""
    z = TUBE / 2
    for s in (1, -1):
        b.tube((s * x, y0, z), (s * x, y1, z))
    for y in cross:
        b.tube((-x, y, z), (x, y, z))


def stack_tower(b, x, y, h=1.45):
    """Weight stack with two guide posts, standing at (x, y)."""
    for dy in (-0.17, 0.17):
        b.tube((x, y + dy, 0), (x, y + dy, h), w=0.06)
    b.tube((x, y - 0.2, h), (x, y + 0.2, h), w=0.08)
    b.tube((x, y - 0.22, 0.04), (x, y + 0.22, 0.04), w=0.14, h=0.08)
    b.box((x, y, 0.47), (0.1, 0.24, 0.72), col=GREY)
    b.box((x, y, 0.86), (0.11, 0.25, 0.05), col=LIGHT)
    for dy in (-0.07, 0.07):
        b.rod((x, y + dy, 0.08), (x, y + dy, h), r=0.012)


def horn(b, x0, x1, y, z, plates=1):
    """Plate horn along X from x0 out to x1, with plates stacked at the inner end."""
    s = 1 if x1 > x0 else -1
    b.rod((x0, y, z), (x1, y, z), r=0.025)
    for i in range(plates):
        b.plate((x0 + s * (0.06 + i * (PLATE_T + 0.008)), y, z))


def leg_extension(b):
    skids(b, 0.3, -0.45, 0.6, cross=(-0.45, 0.6))
    b.tube((0, -0.05, 0.04), (0, -0.05, 0.46), w=0.1)
    b.tube((0, -0.45, 0.04), (0, 0.6, 0.04))
    b.box((0, -0.05, 0.52), (0.46, 0.52, 0.1), col=ACCENT, bevel=0.02)
    b.tube((0, 0.3, 0.04), (0, 0.42, 1.12))
    b.box((0, 0.3, 0.9), (0.42, 0.1, 0.66), pitch=-12, col=ACCENT, bevel=0.02)
    for s in (1, -1):
        b.tube((s * 0.27, -0.28, 0.5), (s * 0.27, -0.42, 0.14), w=0.05)
        b.rod((s * 0.3, 0.02, 0.5), (s * 0.3, 0.02, 0.66), r=0.018, col=BLACK)
    b.rod((-0.3, -0.28, 0.5), (0.3, -0.28, 0.5), r=0.025)
    b.rod((-0.24, -0.44, 0.14), (0.24, -0.44, 0.14), r=0.075, col=ACCENT, seg=10)
    stack_tower(b, 0.58, 0.2)
    b.tube((0.3, 0.2, 0.04), (0.58, 0.2, 0.04))


def leg_curl(b):
    skids(b, 0.3, -0.9, 0.75, cross=(-0.9, 0.75))
    b.tube((0, -0.9, 0.04), (0, 0.75, 0.04))
    for y, z in ((0.5, 0.56), (-0.5, 0.5)):
        b.tube((0, y, 0.04), (0, y, z), w=0.1)
    b.box((0, 0.33, 0.62), (0.5, 0.8, 0.1), pitch=-7, col=ACCENT, bevel=0.02)
    b.box((0, -0.36, 0.6), (0.5, 0.62, 0.1), pitch=9, col=ACCENT, bevel=0.02)
    for s in (1, -1):
        b.tube((s * 0.29, -0.55, 0.5), (s * 0.29, -0.98, 0.74), w=0.05)
        b.rod((s * 0.3, 0.6, 0.3), (s * 0.3, 0.72, 0.42), r=0.018, col=BLACK)
    b.rod((-0.32, -0.55, 0.5), (0.32, -0.55, 0.5), r=0.025)
    b.rod((-0.25, -0.98, 0.76), (0.25, -0.98, 0.76), r=0.075, col=ACCENT, seg=10)
    stack_tower(b, 0.6, -0.15)
    b.tube((0.3, -0.15, 0.04), (0.6, -0.15, 0.04))


def rails(b, x, low, high):
    """Sloped sled rails with rear uprights. Returns the slope angle and a point-along-rail function."""
    low, high = Vector(low), Vector(high)
    for s in (1, -1):
        lo = Vector((s * x, low.y, low.z))
        hi = Vector((s * x, high.y, high.z))
        b.tube(lo, hi, w=0.07)
        b.tube((s * x, high.y, 0), hi, w=0.08)
        b.tube((s * x, low.y, 0), lo, w=0.08)
        b.tube((s * x, high.y - 0.55, 0.04), (s * x, high.y, high.z * 0.55), w=0.06)
    b.tube((-x, high.y, high.z), (x, high.y, high.z))
    d = (high - low).normalized()
    angle = math.degrees(math.atan2(d.z, d.y))
    normal = Vector((0, -d.z, d.y))
    return angle, (lambda t, lift=0.0: low + (high - low) * t + normal * lift), normal


def hack_squat(b):
    skids(b, 0.4, -0.95, 1.0, cross=(-0.95, 1.0))
    angle, at, n = rails(b, 0.33, (0, -0.5, 0.3), (0, 1.0, 1.6))
    b.box(at(-0.1, 0.1), (0.78, 0.5, 0.05), pitch=angle - 90, col=BLACK)
    for s in (1, -1):
        b.tube((s * 0.36, -0.78, 0.04), (s * 0.36, -0.78, 0.16), w=0.06)
    b.box(at(0.5, 0.16), (0.46, 0.95, 0.1), pitch=angle, col=ACCENT, bevel=0.02)
    for t in (0.28, 0.72):
        p = at(t, 0.06)
        b.tube((-0.42, p.y, p.z), (0.42, p.y, p.z), w=0.07)
    for s in (1, -1):
        p = at(0.8, 0.3)
        b.box((s * 0.17, p.y, p.z), (0.14, 0.14, 0.24), pitch=angle, col=ACCENT, bevel=0.02)
        h0, h1 = at(0.86, 0.1), at(0.86, 0.42)
        b.rod((s * 0.33, h0.y, h0.z), (s * 0.33, h1.y, h1.z), r=0.018, col=BLACK)
        p = at(0.72, 0.06)
        horn(b, s * 0.42, s * 0.7, p.y, p.z, plates=2)


def leg_press(b):
    skids(b, 0.42, -1.3, 1.05, cross=(-1.3, 1.05))
    angle, at, n = rails(b, 0.36, (0, -0.4, 0.32), (0, 1.05, 1.6))
    b.box((0, -0.72, 0.3), (0.5, 0.42, 0.1), pitch=14, col=ACCENT, bevel=0.02)
    b.box((0, -1.1, 0.6), (0.5, 0.74, 0.1), pitch=-50, col=ACCENT, bevel=0.02)
    b.tube((0, -0.72, 0.04), (0, -0.72, 0.26), w=0.1)
    b.tube((0, -1.3, 0.04), (0, -1.32, 0.78), w=0.08)
    b.tube((0, -1.3, 0.04), (0, -0.4, 0.04))
    for s in (1, -1):
        b.rod((s * 0.3, -0.75, 0.3), (s * 0.3, -0.75, 0.46), r=0.018, col=BLACK)
    b.box(at(0.42, 0.2), (0.72, 0.62, 0.05), pitch=angle - 90, col=GREY)
    p = at(0.45, 0.06)
    b.tube((-0.44, p.y, p.z), (0.44, p.y, p.z), w=0.09)
    for s in (1, -1):
        horn(b, s * 0.44, s * 0.76, p.y, p.z, plates=3)
        q = at(1.0)
        b.rod((s * 0.4, q.y, q.z * 0.6), (s * 0.62, q.y, q.z * 0.6), r=0.025)


def pendulum_squat(b):
    skids(b, 0.42, -0.75, 1.0, cross=(-0.75, 1.0))
    b.box((0, -0.55, 0.24), (0.82, 0.72, 0.05), pitch=24, col=BLACK)
    b.box((0, -1.22, 0.07), (0.62, 0.48, 0.04), col=BLACK)
    for s in (1, -1):
        b.tube((s * 0.3, -1.4, 0.03), (s * 0.3, -0.9, 0.03), w=0.05, h=0.06)
        b.tube((s * 0.34, -0.3, 0.04), (s * 0.34, -0.26, 0.38), w=0.06)
        # rear tower with plate storage
        b.tube((s * 0.32, 0.95, 0), (s * 0.32, 0.8, 1.72), w=0.09)
        for z in (0.42, 0.82, 1.22):
            y = 0.95 - 0.15 * z / 1.72
            horn(b, s * 0.36, s * 0.62, y, z)
        # scissor braces that carry the swinging arm
        b.tube((s * 0.26, -0.1, 0.06), (s * 0.26, 0.62, 1.5), w=0.06)
        b.tube((s * 0.2, 0.75, 0.06), (s * 0.2, 0.05, 1.42), w=0.05)
        # loaded horn on the lower link
        horn(b, s * 0.3, s * 0.6, 0.25, 0.62)
        # shoulder pads
        b.box((s * 0.16, -0.78, 1.36), (0.14, 0.26, 0.13), pitch=-8, col=ACCENT, bevel=0.02)
    b.tube((-0.32, 0.8, 1.72), (0.32, 0.8, 1.72))
    b.tube((-0.3, 0.25, 0.62), (0.3, 0.25, 0.62), w=0.07)
    b.tube((0, 0.72, 0.62), (0, -0.2, 0.72), w=0.07, col=ACCENT)
    # the pendulum arm, from the top pivot out over the platform
    b.rod((-0.3, 0.72, 1.62), (0.3, 0.72, 1.62), r=0.04, col=GREY)
    b.tube((0, 0.8, 1.64), (0, -0.62, 1.48), w=0.16, h=0.1, col=ACCENT)
    b.tube((0, -0.62, 1.48), (0, -0.74, 0.84), w=0.1, col=ACCENT)
    b.box((0, -0.68, 1.02), (0.36, 0.09, 0.62), pitch=10, col=ACCENT, bevel=0.02)
    b.tube((-0.2, -0.76, 1.4), (0.2, -0.76, 1.4), w=0.06)
    for s in (1, -1):
        b.rod((s * 0.2, -0.76, 1.4), (s * 0.34, -0.9, 1.34), r=0.018, col=BLACK)


def laydown_chest_press(b):
    b.tube((0, -1.25, 0.04), (0, 0.6, 0.04))
    for y, x in ((0.6, 0.55), (-0.1, 0.32)):
        b.tube((-x, y, 0.04), (x, y, 0.04))
    for s in (1, -1):
        b.tube((s * 0.44, 0.6, 0), (s * 0.4, 0.55, 1.55), w=0.09)
        b.tube((s * 0.44, 0.6, 0.04), (s * 0.44, 0.1, 0.04), w=0.07)
        b.tube((s * 0.44, 0.12, 0.04), (s * 0.41, 0.56, 0.9), w=0.06)
        for z in (0.42, 0.98):
            b.rod((s * 0.44, 0.6 - 0.03 * z, z), (s * 0.78, 0.6 - 0.03 * z, z), r=0.025)
        # lever arm: pivot on the tower top, handle over the bench, counter-horn behind
        b.tube((s * 0.3, 0.55, 1.5), (s * 0.4, -0.42, 1.06), w=0.07, col=ACCENT)
        b.tube((s * 0.3, 0.55, 1.5), (s * 0.34, 0.86, 1.2), w=0.07, col=ACCENT)
        b.rod((s * 0.4, -0.42, 1.06), (s * 0.2, -0.5, 1.06), r=0.02, col=BLACK)
        horn(b, s * 0.38, s * 0.66, 0.86, 1.2)
        b.tube((s * 0.3, 0.3, 0.6), (s * 0.3, 0.52, 1.46), w=0.05, col=ACCENT)
    b.tube((-0.4, 0.55, 1.55), (0.4, 0.55, 1.55))
    b.tube((-0.42, 0.57, 0.75), (0.42, 0.57, 0.75), w=0.07)
    b.tube((-0.3, 0.3, 0.6), (0.3, 0.3, 0.6), w=0.05, col=ACCENT)
    b.rod((-0.36, 0.55, 1.5), (0.36, 0.55, 1.5), r=0.035, col=GREY)
    # flat bench and the foot lever at its end
    b.box((0, -0.5, 0.5), (0.32, 1.15, 0.09), col=ACCENT, bevel=0.02)
    for y in (-0.1, -0.9):
        b.tube((0, y, 0.04), (0, y, 0.46), w=0.09)
    b.tube((0, -1.2, 0.08), (0, -1.5, 0.42), w=0.06)
    b.rod((-0.2, -1.5, 0.42), (0.2, -1.5, 0.42), r=0.04, col=BLACK)
    # low hoop that guards the head end
    for s in (1, -1):
        b.tube((s * 0.26, 0.12, 0.04), (s * 0.26, 0.12, 0.72), w=0.05)
    b.tube((-0.26, 0.12, 0.72), (0.26, 0.12, 0.72), w=0.05)


def calisthenics_cube(b):
    r, h, w = 1.2, 2.5, 0.08
    posts = [(-r, -r), (r, -r), (r, r), (-r, r), (0, r), (r, 0)]
    for x, y in posts:
        b.tube((x, y, 0), (x, y, h), w=w)
    for z in (w / 2, h - w / 2):
        b.tube((-r, -r, z), (r, -r, z), w=w)
        b.tube((-r, r, z), (r, r, z), w=w)
        b.tube((-r, -r, z), (-r, r, z), w=w)
        b.tube((r, -r, z), (r, r, z), w=w)
    top = h - w / 2
    b.tube((-r, 0.5, top), (r, 0.5, top), w=w)
    # floor gussets on the four corners
    for x, y in posts[:4]:
        sx, sy = (1 if x < 0 else -1), (1 if y < 0 else -1)
        b.tube((x, y, 0.45), (x + sx * 0.4, y, 0.05), w=0.05)
        b.tube((x, y, 0.45), (x, y + sy * 0.4, 0.05), w=0.05)
    bar = dict(r=0.028, col=ACCENT)
    # monkey ladder across the back of the roof
    for x in (-0.9, -0.55, -0.2, 0.15, 0.5, 0.85):
        b.rod((x, 0.5, top), (x, r, top), **bar)
    # pull-up bars at two heights on the left side, and a diagonal one in the roof
    b.rod((-r, -r, 2.05), (-r, r, 2.05), **bar)
    b.rod((-r, -r, 1.25), (-r, r, 1.25), **bar)
    b.rod((-r, -0.2, top), (-0.2, -r, top), **bar)
    b.rod((-r, -r, top - 0.3), (r, -r, top - 0.3), **bar)
    # low and middle bars on the back
    b.rod((-r, r, 0.95), (0, r, 0.95), **bar)
    b.rod((0, r, 1.6), (r, r, 1.6), **bar)
    # dip bars on the right
    b.rod((r, 0, 1.3), (r, r, 1.3), **bar)
    b.rod((0.68, 0, 1.3), (0.68, r, 1.3), **bar)
    for y in (0, r):
        b.tube((r, y, 1.3), (0.68, y, 1.3), w=0.05)
    # wall bars (rungs) on the front half of the right side
    for z in (0.5, 0.85, 1.2, 1.55, 1.9):
        b.rod((r, -r, z), (r, 0, z), **bar)


def stair_master(b):
    b.box((0, 0.05, 0.19), (0.78, 1.45, 0.38), col=FRAME, bevel=0.03)
    b.box((0, -0.62, 0.05), (0.84, 0.3, 0.1), col=BLACK)
    steps = 4
    for i in range(steps):
        y = -0.42 + 0.27 * i
        z = 0.44 + 0.21 * i
        b.box((0, y, (0.38 + z) / 2), (0.56, 0.27, z - 0.38), col=BLACK)
        b.box((0, y - 0.01, z + 0.02), (0.58, 0.29, 0.04), col=GREY)
    for s in (1, -1):
        # side shrouds that hide the stair chain
        b.box((s * 0.33, 0.12, 0.72), (0.06, 1.25, 0.72), pitch=0, col=FRAME, bevel=0.02)
        b.tube((s * 0.33, 0.66, 0.3), (s * 0.3, 0.62, 1.95), w=0.09)
        # handrails
        b.rod((s * 0.36, -0.5, 1.08), (s * 0.36, -0.5, 1.5), r=0.025, col=LIGHT)
        b.rod((s * 0.36, -0.5, 1.5), (s * 0.34, 0.6, 1.78), r=0.025, col=LIGHT)
        b.rod((s * 0.34, 0.3, 1.7), (s * 0.12, 0.36, 1.72), r=0.02, col=BLACK)
    b.tube((-0.3, 0.62, 1.95), (0.3, 0.62, 1.95), w=0.09)
    b.box((0, 0.56, 1.98), (0.44, 0.08, 0.3), pitch=-20, col=FRAME, bevel=0.015)
    b.box((0, 0.515, 1.98), (0.34, 0.02, 0.2), pitch=-20, col=SCREEN)


MACHINES = {
    "Leg_Extension": leg_extension,
    "Leg_Curl": leg_curl,
    "Hack_Squat": hack_squat,
    "Leg_Press": leg_press,
    "Pendulum_Squat": pendulum_squat,
    "Laydown_Chest_Press": laydown_chest_press,
    "Calisthenics_Cube": calisthenics_cube,
    "Stair_Master": stair_master,
}


def palette_material():
    mat = bpy.data.materials.get("fitheon_palette")
    if mat:
        return mat
    mat = bpy.data.materials.new("fitheon_palette")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    tex = nodes.new("ShaderNodeTexImage")
    tex.image = bpy.data.images.load(PALETTE, check_existing=True)
    tex.interpolation = 'Closest'
    bsdf = next(n for n in nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs["Roughness"].default_value = 0.6
    mat.node_tree.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    nodes.active = tex
    return mat


def build_all(spacing=3.4):
    """(Re)creates the Machines scene. Returns the machine objects."""
    scene = bpy.data.scenes.get("Machines") or bpy.data.scenes.new("Machines")
    for ob in list(scene.collection.objects):
        if ob.type == 'MESH':
            mesh = ob.data
            bpy.data.objects.remove(ob, do_unlink=True)
            if mesh.users == 0:
                bpy.data.meshes.remove(mesh)
    mat = palette_material()
    objects = []
    for i, (name, make) in enumerate(MACHINES.items()):
        b = Builder()
        make(b)
        mesh = b.finish(name)
        mesh.materials.append(mat)
        ob = bpy.data.objects.new(name, mesh)
        ob.location.x = i * spacing
        scene.collection.objects.link(ob)
        objects.append(ob)
    return scene, objects


def export_all(scene, objects):
    """Writes one FBX per machine (at the origin) and a .blend that holds only the Machines scene."""
    os.makedirs(os.path.join(OUT, "fbx"), exist_ok=True)
    window = bpy.context.window
    previous = window.scene
    window.scene = scene
    try:
        for ob in objects:
            for other in scene.collection.objects:
                other.select_set(other is ob)
            bpy.context.view_layer.objects.active = ob
            x = ob.location.x
            ob.location.x = 0
            bpy.ops.export_scene.fbx(
                filepath=os.path.join(OUT, "fbx", ob.name + ".fbx"),
                use_selection=True, object_types={'MESH'}, mesh_smooth_type='FACE',
                path_mode='STRIP', add_leaf_bones=False, bake_anim=False)
            ob.location.x = x
    finally:
        window.scene = previous
    bpy.data.libraries.write(os.path.join(OUT, "fitheon_machines.blend"), {scene},
                             path_remap='RELATIVE_ALL', compress=True)


if __name__ == "__main__":
    export_all(*build_all())
