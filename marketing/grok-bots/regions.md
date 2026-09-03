# Region rotation

Every bot runs nationwide first, then walks this list one region per week so
you get local groups too. The weekly Automation prompts pick the region by
ISO week number, so all five bots cover the same region in the same week.

| Slot (week mod 12) | Region |
|---|---|
| 0 | US nationwide (no region filter) |
| 1 | New York City, NY |
| 2 | Los Angeles / San Diego, CA |
| 3 | Chicago, IL |
| 4 | Texas (Houston, Dallas–Fort Worth, Austin) |
| 5 | Florida (Miami, Tampa, Orlando) |
| 6 | Phoenix / Scottsdale, AZ |
| 7 | Atlanta, GA |
| 8 | Denver, CO |
| 9 | Seattle, WA / Portland, OR |
| 10 | Boston, MA / Philadelphia, PA / Washington, DC |
| 11 | San Francisco Bay Area, CA |

Second lap (swap in when the first lap is done): Nashville TN, Charlotte /
Raleigh NC, Las Vegas NV, Minneapolis MN, Salt Lake City UT, Ohio, Michigan,
New Jersey, Virginia, Georgia (outside Atlanta), Pennsylvania, Tennessee.

To run a region by hand in a bot Workspace: `Run your search for {region}.`
