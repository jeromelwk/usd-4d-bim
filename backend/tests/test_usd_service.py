from pxr import UsdGeom

from app import usd_service


def _count_types(node, counts):
    counts[node["type"]] = counts.get(node["type"], 0) + 1
    for child in node["children"]:
        _count_types(child, counts)


def test_generate_sample_building(tmp_path):
    geo_path = tmp_path / "geometry.usda"
    usd_service.generate_sample_building(geo_path)

    assert geo_path.exists()

    tree = usd_service.load_geometry_tree(geo_path)
    assert len(tree) == 1
    assert tree[0]["path"] == "/Building"
    assert tree[0]["type"] == "Xform"

    counts = {}
    for node in tree:
        _count_types(node, counts)
    assert counts.get("Xform") == 4
    assert counts.get("Mesh") == 9


def test_sample_foundation_is_mesh(tmp_path):
    geo_path = tmp_path / "geometry.usda"
    usd_service.generate_sample_building(geo_path)

    from pxr import Usd
    stage = Usd.Stage.Open(str(geo_path))
    foundation = stage.GetPrimAtPath("/Building/Foundation")
    assert foundation.IsValid()
    assert foundation.IsA(UsdGeom.Mesh)

    walls = stage.GetPrimAtPath("/Building/Floor1/Walls")
    assert walls.IsValid()
    assert walls.IsA(UsdGeom.Xform)


def test_open_and_normalize_geometry(tmp_path):
    src = tmp_path / "src.usda"
    usd_service.generate_sample_building(src)

    dest = tmp_path / "geometry.usda"
    usd_service.open_and_normalize_geometry(src, dest)
    assert dest.exists()

    tree = usd_service.load_geometry_tree(dest)
    assert tree[0]["path"] == "/Building"


def test_open_and_normalize_geometry_invalid_file(tmp_path):
    bogus = tmp_path / "bogus.usda"
    bogus.write_text("this is not usd content { garbage")

    dest = tmp_path / "geometry.usda"
    try:
        usd_service.open_and_normalize_geometry(bogus, dest)
        assert False, "expected ValueError"
    except ValueError:
        pass
