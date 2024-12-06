const express = require("express");
const fs = require("fs");
const bodyParser = require("body-parser");
const { exec } = require("child_process");

const app = express();
const PORT = 3000;

// Middleware to parse form data
app.use(bodyParser.urlencoded({ extended: true }));

// Load JSON data from file
const jsonFilePath = "data.json";

app.get("/", (req, res) => {
    fs.readFile(jsonFilePath, "utf8", (err, fileData) => {
        if (err) {
            console.error("Error reading data file:", err);
            res.status(500).send("Error reading data file");
            return;
        }

        let data;
        try {
            data = JSON.parse(fileData);
        } catch (parseErr) {
            console.error("Error parsing JSON file:", parseErr);
            res.status(500).send("Error parsing JSON file");
            return;
        }

        // HTML structure
        let html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VM Migration</title>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            background-color: #f9f9f9;
            color: #333;
            margin: 20px;
            padding: 20px;
        }
        h1 {
            text-align: center;
            color: #555;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: #fff;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            border-radius: 10px;
        }
        .vm-list {
            margin-bottom: 20px;
        }
        .vm-card {
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 15px;
            background: #fdfdfd;
        }
        .vm-card h2 {
            margin-top: 0;
            font-size: 18px;
            color: #444;
        }
        .section {
            margin-bottom: 10px;
        }
        .section-title {
            font-weight: bold;
            color: #666;
            margin-bottom: 5px;
        }
        .key-value {
            margin-left: 20px;
        }
        label {
            display: flex;
            align-items: center;
        }
        input[type="checkbox"] {
            margin-right: 10px;
        }
        button {
            display: block;
            width: 100%;
            padding: 12px;
            font-size: 16px;
            background-color: #007bff;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
        }
        button:hover {
            background-color: #0056b3;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Select VMs for Migration</h1>
        <form action="/run-playbook" method="POST">
            <div class="vm-list">
`;

        try {
            data.esx1.forEach(vm => {
                html += `
                <div class="vm-card">
                    <label>
                        <input type="checkbox" name="vm_name" value="${vm.vm_name}">
                        <h2>${vm.vm_name}</h2>
                    </label>
                    <div class="section">
                        <div class="section-title">OpenStack Information</div>
                        <div class="key-value">
                            ${Object.entries(vm.openstack)
                                .map(([key, value]) => `<div>${key}: ${value || "N/A"}</div>`)
                                .join("")}
                        </div>
                    </div>
                    <div class="section">
                        <div class="section-title">VMware Guest Info</div>
                        <div class="key-value">
                            ${Object.entries(vm.vmware_guest_info)
                                .map(([key, value]) => `<div>${key}: ${value || "N/A"}</div>`)
                                .join("")}
                        </div>
                    </div>
                    <div class="section">
                        <div class="section-title">Migration Details</div>
                        <div class="key-value">
                            ${Object.entries(vm.migration)
                                .map(([key, value]) => `<div>${key}: ${value || "N/A"}</div>`)
                                .join("")}
                        </div>
                    </div>
                </div>
                `;
            });
        } catch (error) {
            console.error("Error extracting VM data:", error);
            res.status(500).send("Error extracting VM data");
            return;
        }

        html += `
            </div>
            <button type="submit">Run Migration</button>
        </form>
    </div>
</body>
</html>
`;

        res.send(html);
    });
});

app.post("/run-playbook", (req, res) => {
    const selectedVMs = req.body.vm_name;

    if (!selectedVMs) {
        res.send("No VMs selected.");
        return;
    }

    const vmNames = Array.isArray(selectedVMs) ? selectedVMs : [selectedVMs]; // Ensure it's an array

    // Run ansible-playbook command for each selected VM
    vmNames.forEach(vmName => {
        const command = `ansible-playbook -i localhost run.yaml -e vm_name=${vmName}`;
        console.log(`Executing: ${command}`);
        exec(command, (err, stdout, stderr) => {
            if (err) {
                console.error(`Error executing playbook for ${vmName}:`, err);
                return;
            }
            console.log(`Playbook output for ${vmName}:\n${stdout}`);
            if (stderr) {
                console.error(`Playbook errors for ${vmName}:\n${stderr}`);
            }
        });
    });

    res.send(`Migration started for VMs: ${vmNames.join(", ")}`);
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
