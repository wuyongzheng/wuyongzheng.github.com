import numpy as np
from scipy.spatial import Voronoi
from scipy.spatial import ConvexHull
from shapely.geometry import Polygon

# load datafile from tsv file
# format: min max lng lat Name
# e.g:    5 14 103.88289235624 1.3728160487914 Xinmin Secondary School
with open('z8','r') as f:
    data=[x.strip().split('\t') for x in f]
points = np.array([[float(r[2]),float(r[3])] for r in data])

# compute color based on sort ranking.
#color = np.array([float(r[6])/(float(r[5])+1) for r in data])
color = np.array([float(r[1])+float(r[0])*0.1 for r in data])
color = color.argsort().argsort() # after this, color[x] is the ranking of xth point
color = ['{:02X}00{:02X}'.format(r*255//len(color), 255-r*255//len(color)) for r in color]

hull = ConvexHull(points)
hullpoly = []
for idx in hull.vertices:
    hullpoly.append(hull.points[idx])
hullpoly = Polygon(hullpoly)

# place 4 extra points outside
# polygon.bounds is a (minx, miny, maxx, maxy) tuple.
center = np.array([hullpoly.bounds[0] + hullpoly.bounds[2], hullpoly.bounds[1] + hullpoly.bounds[3]]) / 2
size =   np.array([hullpoly.bounds[2] - hullpoly.bounds[0], hullpoly.bounds[3] - hullpoly.bounds[1]])
bound_points = np.array([
    center - size,
    [center[0] + size[0], center[1] - size[1]],
    center + size,
    [center[0] - size[0], center[1] + size[1]]]);

# compute Voronoi tesselation
vor = Voronoi(np.concatenate((points, bound_points)))

#print "points"
#print vor.points
#print "vertices"
#print vor.vertices
#print "regions"
#print vor.regions

print('<!DOCTYPE html>')
print('<html>')
print('  <head>')
print('    <meta name="viewport" content="initial-scale=1.0">')
print('    <meta charset="utf-8">')
print('    <title>Singapore Secondary School Ranking by AL Cut Off Point</title>')
print('    <style>')
print('      html, body {')
print('        height: 100%;')
print('        margin: 0;')
print('        padding: 0;')
print('      }')
print('      #map {')
print('        height: 100%;')
print('      }')
print('    </style>')
print('  </head>')
print('  <body>')
print('    <div id="map"></div>')
print('    <script>')
print('function initMap() {')
print("  var map = new google.maps.Map(document.getElementById('map'), {")
print('    zoom: 12,')
print('    center: {lat: 1.3595015, lng: 103.8264145}')
print('  });')
print('infoWindow = new google.maps.InfoWindow;')
print('function showInfo(event) {')
print('  infoWindow.setContent(this.infotext);')
print('  infoWindow.setPosition(this.center);')
print('  infoWindow.open(map);')
print('}')

for point_id in range(len(points)):
    region_id = vor.point_region[point_id]
    if region_id == -1: continue
    region = vor.regions[region_id]
    if -1 in region: continue
    poly = []
    for idx in region:
        poly.append(vor.vertices[idx])
    poly = Polygon(poly)
    if not poly.intersects(hullpoly): continue
    intersection = poly.intersection(hullpoly)

    print("// " + data[point_id][4])
    print("var coords = [")
    for point in list(intersection.exterior.coords):
        lng = point[0]
        lat = point[1]
        print('{{lat: {}, lng: {}}},'.format(lat, lng))
    print('];')
    print("  var poly = new google.maps.Polygon({")
    print("    paths: coords,")
    print("    strokeColor: '#000000',")
    print("    strokeOpacity: 0.5,")
    print("    fillColor: '#{}',".format(color[point_id]))
    print("    fillOpacity: 0.3,")
    print("  });")
    print("  poly.setOptions({zIndex:-1});")
    print("  poly.setMap(map);")
    print("  var circ = new google.maps.Circle({")
    print("    strokeColor: '#FF0000',")
    print("    strokeOpacity: 0,")
    print("    fillColor: '#00FF00',")
    print("    fillOpacity: 0.8,")
    print("    center: {{lat: {}, lng: {}}},".format(points[point_id][1], points[point_id][0]))
    print("    map: map,")
    print("    radius: 100,")
    print('    infotext: "{}: {}-{}",'.format(data[point_id][4], data[point_id][0], data[point_id][1]))
    print("  });")
    print("  circ.addListener('click', showInfo);");

print('}')
print('    </script>')
print('    <script async defer src="https://maps.googleapis.com/maps/api/js?key=AIzaSyCJvBveKdnhCw9MaDwzFb_7cTnXWNohROU&callback=initMap">')
print('    </script>')
print('  </body>')
print('</html>')
