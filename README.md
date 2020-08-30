# GarminGraphs

## Features

This Firefox extension adds Colored Zones to Heart Rate and Stryd Power graphs in Garmin Connect Web Activity Pages:

![New Graphs](pics/main.png?raw=true)


## Build

Extension is very light in terms of build stack, it only uses TypeScript compiler and a [web-ext](https://github.com/mozilla/web-ext) to prepare production zip file.


## Architecture

Extension consists of following files:

* background.ts

    Background script executes once per extension instance. Contains Data Sniffing functionality — intercepts XHR's to Garmin API and extracts relevant information about activities, user and so on; Tab tracker and Data Router — keeps track of open tabs with Garmin Connect, sends relevant activity data upon navigating to Activity Page. Garmin Connect is an SPA and uses History API, only background script can listen for those events and dispatch data.

* content.ts

    Content script spawns on every Garmin Connect Page, it listens to incoming activity data from background script, finds and replaces stock graphs with colored [D3.js](https://d3js.org/) ones.

* options.html + options.ts 

    Preference page, uses [Preact](https://preactjs.com/) and [HTM](https://github.com/developit/htm) ES modules to avoid extra build steps.

* types.ts

    Provides common types for background-content communication, describes relevant parts of the Garmin API responses

* libs dir 

    Contains D3 microlibraries and Preact ES modules to cut on size without introducing build steps.