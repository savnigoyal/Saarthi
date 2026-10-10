"""
SafeRoute — OpenStreetMap Data Downloader
==========================================
Downloads geographic features for Jaipur, Rajasthan, India
from OpenStreetMap using the OSMnx library.

DATA HONESTY NOTICE:
- All data is OpenStreetMap-derived geographic data.
- This is NOT real-time data.
- Pedestrian activity is ESTIMATED from nearby mapped points.
- No CCTV, crime, or live sensor data is included.

HOW TO RUN:
    pip install osmnx
    python download_data.py

SAFETY SCORE MAPPING:
    Street Lighting & Visibility    (25%) <- street_lights
    Estimated Pedestrian Activity   (20%) <- restaurants, shops, bus_stops,
                                             schools, universities
    Police & CCTV Proximity         (15%) <- police_stations
    Safe Havens & Infrastructure    (15%) <- hospitals, pharmacies,
                                             police_stations, bus_stops
    Historical Incident Safety      (25%) <- NOT implemented. Needs official
                                             crime dataset. DO NOT fabricate.
"""

import os
import sys
import osmnx as ox

# Force stdout to flush immediately so progress prints even when slow
sys.stdout.reconfigure(line_buffering=True)

# -----------------------------------------
# SETTINGS
# -----------------------------------------

PLACE = "Jaipur, Rajasthan, India"
OUTPUT_DIR = "data"

# OSMnx timeout in seconds per query (default is 180)
# Increase this if you are on a slow connection
ox.settings.timeout = 300

os.makedirs(OUTPUT_DIR, exist_ok=True)

# -----------------------------------------
# DATASETS
# -----------------------------------------

datasets = {

    # Safety Factor 1: Street Lighting & Visibility (25%)
    "street_lights": {
        "highway": "street_lamp"
    },

    # Safety Factor 3: Police & CCTV Proximity (15%)
    # NOTE: CCTV not yet available — using police stations only.
    "police_stations": {
        "amenity": "police"
    },

    # Safety Factor 4: Safe Havens & Infrastructure (15%)
    "hospitals": {
        "amenity": "hospital"
    },
    "pharmacies": {
        "amenity": "pharmacy"
    },

    # Safety Factor 2: Estimated Pedestrian Activity (20%)
    # NOTE: These are map-derived proximity points, NOT real-time footfall.
    "restaurants": {
        "amenity": "restaurant"
    },
    "shops": {
        "shop": True
    },
    # Bus stops count for BOTH pedestrian activity AND safe havens.
    "bus_stops": {
        "highway": "bus_stop"
    },
    "schools": {
        "amenity": "school"
    },
    "universities": {
        "amenity": "university"
    },

    # Safety Factor 5: Historical Incident Safety (25%)
    # NOT downloaded here. Requires official verified crime/incident dataset.
    # DO NOT fabricate crime data.

}


# -----------------------------------------
# DOWNLOAD EACH DATASET
# -----------------------------------------

print("================================", flush=True)
print("SafeRoute — OSM Data Downloader", flush=True)
print("Location:", PLACE, flush=True)
print("Timeout per query:", ox.settings.timeout, "seconds", flush=True)
print("================================", flush=True)

success_count = 0
failure_count = 0
empty_count = 0

for dataset_name, tags in datasets.items():

    print("\n--------------------------------", flush=True)
    print("Downloading:", dataset_name, flush=True)
    print("Tags:", tags, flush=True)
    print("Querying Overpass API... (this may take 1-2 minutes)", flush=True)

    try:

        gdf = ox.features_from_place(PLACE, tags=tags)

        if gdf.empty:
            print("WARNING: No data found for", dataset_name, flush=True)
            empty_count += 1
            continue

        # Convert MultiIndex into normal columns
        gdf = gdf.reset_index()

        # Drop list-valued columns that can't be serialised to GeoJSON
        cols_to_drop = []
        for col in gdf.columns:
            if gdf[col].dtype == object:
                sample = gdf[col].dropna()
                if len(sample) > 0 and isinstance(sample.iloc[0], list):
                    cols_to_drop.append(col)
        if cols_to_drop:
            gdf = gdf.drop(columns=cols_to_drop)

        output_file = os.path.join(OUTPUT_DIR, dataset_name + ".geojson")

        gdf.to_file(output_file, driver="GeoJSON")

        print("Saved:", output_file, "| Records:", len(gdf), flush=True)
        success_count += 1

    except Exception as error:
        print("ERROR downloading", dataset_name, flush=True)
        print("Reason:", error, flush=True)
        print("Skipping this dataset and continuing...", flush=True)
        failure_count += 1


# -----------------------------------------
# SUMMARY
# -----------------------------------------

print("\n================================", flush=True)
print("DATA DOWNLOAD COMPLETE", flush=True)
print("================================", flush=True)
print("Succeeded :", success_count, "dataset(s)", flush=True)
print("Empty     :", empty_count,   "dataset(s) — no OSM records found", flush=True)
print("Failed    :", failure_count, "dataset(s) — see errors above", flush=True)
print("Output    :", os.path.abspath(OUTPUT_DIR), flush=True)
print()
print("REMINDER — Data honesty:", flush=True)
print("  All values are OpenStreetMap-derived geographic data.", flush=True)
print("  Historical Incident Safety (25%) is NOT populated yet.", flush=True)
print("================================", flush=True)
