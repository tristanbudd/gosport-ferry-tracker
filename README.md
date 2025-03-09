# Gosport Ferry Tracker
![](https://img.shields.io/github/stars/tristanbudd/gosport-ferry-tracker.svg) ![](https://img.shields.io/github/forks/tristanbudd/gosport-ferry-tracker.svg) ![](https://img.shields.io/github/tag/tristanbudd/gosport-ferry-tracker.svg) ![](https://img.shields.io/github/release/tristanbudd/gosport-ferry-tracker.svg) ![](https://img.shields.io/github/issues/tristanbudd/gosport-ferry-tracker.svg)

## What is this for?
Gosport Ferry Tracker is an open source project allowing users to track the Gosport Ferry and view useful status information before their arrival.

Some of the key features of the tracker:
- Utilise AIS Ship Tracking tools to calculate the position of the Gosport Ferry.
- Predict the upcoming timetables of incoming / outgoing ships.
- View tracking logs and download data for analysis.
- Details about which vessel is currently in service and its details.
- Serverside status checks & real-time updating.
- Mobile responsiveness up to 300 pixels wide.

## To-Do List
- Neaten code in areas & add comments.
- Add optimisations and export some functions used in multiple files.
- Add Favicon(s) (Code already in place and ready)
- Calculate an average crossing time for more accurate time estimations.

## Screenshots
![Preview Image #1](https://github.com/user-attachments/assets/c1463a60-5e4a-4985-818e-bd6824f6eb44)
![Preview Image #2](https://github.com/user-attachments/assets/83a1a5ad-f56f-4d7f-885f-65c1fb928477)
![Preview Image #3](https://github.com/user-attachments/assets/a6e8a4aa-9b2c-46c9-8cbb-ff5d5b15b8f7)
![Preview Image #4](https://github.com/user-attachments/assets/ddf7c734-4131-49be-842e-3075c8579f3e)

## Installation
1. Install the latest release: [Click Here](https://github.com/tristanbudd/gosport-ferry-tracker/releases/ "Click Here")
2. Create a .env file and add the field: ```AISSTREAM_API_KEY=[Your AISStream API Key Here]``` (https://aisstream.io/)
3. Install all node dependancies and run the serverside code: ```node server.js```
4. Wait up to 10 minutes for data to fully populate, it will become more reliable the longer it runs.
5. Access the index.html and the website should be fully operational.
