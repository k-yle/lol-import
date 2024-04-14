# List of Lights

![](https://github.com/k-yle/lol-import/actions/workflows/ci.yml/badge.svg)
![](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fcdn.list.lighting%2Fstats.json&query=%24.timestampNoTime&label=last%20updated&color=31c654)

🛥️🔦 This code parses the [**List of Lights**](https://msi.nga.mil/Publications/NGALOL) into an S-57 compatible format, and then conflates the data with OpenStreetMap's seamarks. The results can be viewed and downloaded from [https://list.lighting](https://list.lighting)

This script has two separate outputs:

1. A report of which lights in OpenStreetMap need updating
2. A copy of the LOL database, parsed and converted into an S-57 compatible format

# Data License

- The **data** is sourced from US Department of Defence, and available under a public domain license which is compatible with OpenStreetMap's ODbL license.
- The **code** is licensed under the [MIT license](./LICENSE).

# Disclaimer

As usual, data from this tool or from OpenStreetMap **should never be used for marine navigation**.
The contributors of this project take no responsibility for the accuracy of the data.
Always use official nautical charts.
