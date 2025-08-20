const canvas = document.createElement('canvas');
const mapContainer = document.getElementById('map');
canvas.style.display = 'block';
canvas.style.margin = '0 auto';
mapContainer.appendChild(canvas);
canvas.width = 900;
canvas.height = 600;
const ctx = canvas.getContext('2d');

// lines
const lines = [
    { color: '#ff5555', points: [[100, 100], [200, 100], [300, 100], [362, 150], [495, 255], [550, 300], [647, 378], [800, 500]] }, // red
    { color: '#55ff55', points: [[50, 360], [120, 360], [150, 400], [200, 400], [400, 400], [430, 354], [495, 255], [567, 150], [600, 100], [700, 100]] }, // green
    { color: '#5555ff', points: [[80, 500], [133, 500], [323, 500], [450, 500], [460, 450], [482, 330], [495, 255], [629, 220], [700, 200]] }, // blue
    { color: '#ff55ff', points: [[100, 550], [133, 500], [200, 400], [430, 354], [482, 330], [550, 300], [700, 300], [750, 300]] }, // pink
    { color: '#FFA500', points: [[50, 200], [120, 200], [150, 300], [300, 280], [400, 240], [495, 255], [495, 150], [400, 57]] }, // orange
    { color: '#808080', points: [[200, 50], [200, 100], [200, 180], [300, 280], [430, 354], [460, 450], [500, 500], [700, 520]] }, // grey
    { color: '#8B4513', points: [[150, 300], [200, 180], [362, 150], [495, 150], [567, 150], [629, 220], [700, 300], [647, 378], [600, 450], [460, 450], [225, 450], [200, 400], [150, 300]]}, // brown circular line
];

// calculate distances for each line
lines.forEach(line => {
    line.distances = [0];
    let totalDistance = 0;
    for (let i = 1; i < line.points.length; i++) {
        totalDistance += distance(line.points[i-1], line.points[i]);
        line.distances.push(totalDistance);
    }
    line.totalLength = totalDistance;
});

// trains
const STOP_DELAY = 50; // wait at each station
const TRAINS_PER_DIRECTION = 3; // number of trains in each direction
const trains = [];

// create trains for a line
function createTrainsForLine(lineIndex, isCircular = false) {
    const line = lines[lineIndex];
    const spacing = line.totalLength / (TRAINS_PER_DIRECTION + 1); // space between trains

    if (isCircular) {
        // circular line create trains in both directions
        const circularSpacing = line.totalLength / (TRAINS_PER_DIRECTION + 1);
        // forward direction trains
        for (let i = 0; i < TRAINS_PER_DIRECTION; i++) {
            trains.push({
                line: lineIndex,
                distance: Math.random() * line.totalLength, // random start
                speed: 0.8,
                stopCounter: 0,
                direction: 1
            });
        }
        // backward direction trains
        for (let i = 0; i < TRAINS_PER_DIRECTION; i++) {
            trains.push({
                line: lineIndex,
                distance: Math.random() * line.totalLength, // random start
                speed: 0.8,
                stopCounter: 0,
                direction: -1
            });
        }
    // normal lines
    } else {
        // forward direction trains
        for (let i = 0; i < TRAINS_PER_DIRECTION; i++) {
            trains.push({
                line: lineIndex,
                distance: Math.random() * line.totalLength, // random start
                speed: 0.8,
                stopCounter: 0,
                direction: 1
            });
        }
        // backward direction trains
        for (let i = 0; i < TRAINS_PER_DIRECTION; i++) {
            trains.push({
                line: lineIndex,
                distance: Math.random() * line.totalLength, // random start
                speed: 0.8,
                stopCounter: 0,
                direction: -1
            });
        }
    }
}

// create trains for each line
createTrainsForLine(0); // red line
createTrainsForLine(1); // green line
createTrainsForLine(2); // blue line
createTrainsForLine(3); // pink line
createTrainsForLine(4); // orange line
createTrainsForLine(5); // grey line
createTrainsForLine(6, true); // brown circular line

function canvasToLatLon(x, y) {
    const minLat = 55.70, maxLat = 55.80;
    const minLon = 37.55, maxLon = 37.70;
    const lat = minLat + (maxLat - minLat) * (y / 600);
    const lon = minLon + (maxLon - minLon) * (x / 900);
    return { lat, lon };
}

// get nearest station name for a train
function getNearestStation(line, trainDistance) {
    let minDist = Infinity;
    let nearestIdx = 0;
    for (let i = 0; i < line.distances.length; i++) {
        const d = Math.abs(line.distances[i] - trainDistance);
        if (d < minDist) {
            minDist = d;
            nearestIdx = i;
        }
    }
    return { idx: nearestIdx, point: line.points[nearestIdx] };
}

// map hex codes to color names
const colorNames = {
    '#ff5555': 'red',
    '#55ff55': 'green',
    '#5555ff': 'blue',
    '#ff55ff': 'pink',
    '#FFA500': 'orange',
    '#808080': 'grey',
    '#8B4513': 'brown'
};

function sendAllTrainUpdates() {

    function getRandomMeta() {
        const metaTypes = ["Next maintenance", "Inspected", "Refurbished", ""];
        const type = metaTypes[Math.floor(Math.random() * metaTypes.length)];

        if (type === "") return "";

        const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, "0");
        let year;

        if (type === "Next maintenance") {
            year = 2025 + Math.floor(Math.random() * 6);
        } else {
            year = 2020 + Math.floor(Math.random() * 5);
        }

        return `${type} ${month}.${year}`;
    }

    const allMetrics = trains.map(train => {
        const line = lines[train.line];
        const colorName = colorNames[line.color] || line.color; // fallback to hex if not found

        // find the current segment
        let segment = 0;
        while (segment < line.distances.length - 1 && line.distances[segment + 1] < train.distance) {
            segment++;
        }

        // calculate position within segment
        const segmentDistance = train.distance - line.distances[segment];
        const segmentLength = line.distances[segment + 1] - line.distances[segment];
        const t = segmentLength === 0 ? 0 : segmentDistance / segmentLength;

        const x = line.points[segment][0] + t * (line.points[segment + 1][0] - line.points[segment][0]);
        const y = line.points[segment][1] + t * (line.points[segment + 1][1] - line.points[segment][1]);

        // set speed
        const speed = Math.random() * 80;
        // find nearest station
        const nearest = getNearestStation(line, train.distance);
        const stationName = `Line${colorName}_Station${nearest.idx}`;
        const position = canvasToLatLon(x, y);
        const train_id = `line${colorName}_train${trains.indexOf(train)}_dir${train.direction}`;
        const meta = getRandomMeta();

        return {
            train_id: train_id,
            color: colorName,
            position: position,
            station: stationName,
            speed: speed,
            group_id: 1,
            timestamp: new Date().toISOString(),
            meta: meta
        };
    });

    // send metrics
    fetch('/api/train_updates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metrics: allMetrics })
    }).catch(err => {});
}

setInterval(sendAllTrainUpdates, 300);

function draw() {
    ctx.fillStyle = '#1e1e1e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // draw lines and stations
    lines.forEach(line => {
        // draw lines
        ctx.strokeStyle = line.color;
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(line.points[0][0], line.points[0][1]);
        for (let i = 1; i < line.points.length; i++) {
            ctx.lineTo(line.points[i][0], line.points[i][1]);
        }
        ctx.stroke();

        // draw stations
        ctx.fillStyle = '#ffffff';
        line.points.forEach(point => {
            ctx.beginPath();
            ctx.arc(point[0], point[1], 6, 0, Math.PI * 2);
            ctx.fill();
        });
    });

    // draw trains
    trains.forEach(train => {
        const line = lines[train.line];
        
        // find the current segment
        let segment = 0;
        while (segment < line.distances.length - 1 && line.distances[segment + 1] < train.distance) {
            segment++;
        }

        // calculate position within segment
        const segmentDistance = train.distance - line.distances[segment];
        const segmentLength = line.distances[segment + 1] - line.distances[segment];
        const t = segmentLength === 0 ? 0 : segmentDistance / segmentLength;

        // check if train is at a station
        const STATION_THRESHOLD = 0.005; // distance to trigger stop
        const isAtStation = t < STATION_THRESHOLD || t > (1 - STATION_THRESHOLD);

        if (isAtStation) {
            if (train.stopCounter < STOP_DELAY) {
                train.stopCounter++;
                // don't update distance while stopped
            } else {
                train.stopCounter = 0;
                // update distance based on direction
                train.distance = train.direction > 0 ? 
                    (train.distance + train.speed) % line.totalLength :
                    (train.distance - train.speed + line.totalLength) % line.totalLength;
            }
        } else {
            // normal movement between stations
            train.distance = train.direction > 0 ? 
                (train.distance + train.speed) % line.totalLength :
                (train.distance - train.speed + line.totalLength) % line.totalLength;
        }
        
        const x = line.points[segment][0] + t * (line.points[segment + 1][0] - line.points[segment][0]);
        const y = line.points[segment][1] + t * (line.points[segment + 1][1] - line.points[segment][1]);

        // calculate direction for arrow
        let dx = line.points[segment + 1][0] - line.points[segment][0];
        let dy = line.points[segment + 1][1] - line.points[segment][1];
        let angle = Math.atan2(dy, dx);
        
        // reverse angle for backwards-moving trains
        if (train.direction < 0) {
            angle += Math.PI;
        }

        // draw arrow
        ctx.fillStyle = isAtStation ? '#ffff00' : '#ffffff'; // yellow when stopped, white when moving
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);

        // arrow shape
        ctx.beginPath();
        ctx.moveTo(-10, -5);
        ctx.lineTo(10, 0);
        ctx.lineTo(-10, 5);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    });

    requestAnimationFrame(draw);
}

function distance(point1, point2) {
    const dx = point2[0] - point1[0];
    const dy = point2[1] - point1[1];
    return Math.sqrt(dx * dx + dy * dy);
}

draw();