document.addEventListener("DOMContentLoaded", () => {
            // DOM Elements
            const markdownFileInput = document.getElementById("markdown-file");
            const markdownTextArea = document.getElementById("markdown-text");
            const processBtn = document.getElementById("process-btn");
            const markdownPreview = document.getElementById("markdown-preview");
            const themeSelect = document.getElementById("theme-select");
            const toolsSection = document.querySelector(".tools-section");
            const cropPointsContainer = document.getElementById("crop-points-container");
            const addCropPointBtn = document.getElementById("add-crop-point");
            const h1LevelBtn = document.getElementById("h1-level-btn");
            const h2LevelBtn = document.getElementById("h2-level-btn");
            const h3LevelBtn = document.getElementById("h3-level-btn");
            const clearLevelBtn = document.getElementById("clear-level-btn");
            const watermarkText = document.getElementById("watermark-text");
            const watermarkColor = document.getElementById("watermark-color");
            const watermarkOpacity = document.getElementById("watermark-opacity");
            const watermarkPosition = document.getElementById("watermark-position");
            const watermarkRotation = document.getElementById("watermark-rotation");
            const rotationValue = document.getElementById("rotation-value");
            const applyWatermarkBtn = document.getElementById("apply-watermark");
            const exportAllBtn = document.getElementById("export-all");
            const downloadAllBtn = document.getElementById("download-all-btn");
            const imageWidthSelect = document.getElementById("image-width-select");
            const customWidthContainer = document.getElementById(
                "custom-width-container"
            );
            const customImageWidth = document.getElementById("custom-image-width");
            const exportSectionsContainer = document.getElementById(
                "export-sections-container"
            );
            const resultsSection = document.getElementById("results-section");
            const resultsContainer = document.getElementById("results-container");

            // State variables
            let markdownContent = "";
            let headings = [];
            let cropPoints = [];
            let watermarkApplied = false;
            let activeHeadingLevel = null; // For auto-cropping by heading level
            let watermarkSettings = {
                text: "",
                color: "#888888",
                opacity: 0.3,
                position: "bottom-right",
                rotation: 0,
            };
            let imageWidth = 800; // Default image width
            let markdownFileBasePath = ""; // Store the base path for resolving image references

            // Initialize marked.js
            const renderer = new marked.Renderer();

            // Custom image renderer to handle image paths
            renderer.image = function(href, title, text) {
                // Handle case where href is an object (from marked lexer)
                if (href && typeof href === "object") {
                    console.log("Object href received:", href);
                    // If href has its own href property, use that
                    if (href.href && typeof href.href === "string") {
                        text = href.text || text || "";
                        title = href.title || title || null;
                        href = href.href;
                    } else if (href.raw && typeof href.raw === "string") {
                        // Try to use raw property if available
                        href = href.raw;
                    } else {
                        console.warn("Invalid href object structure:", href);
                        href = "";
                    }
                }

                // Ensure href is a string
                if (!href || typeof href !== "string") {
                    console.warn("Invalid href received:", href);
                    href = "";
                }

                // Check if the href is already a data URL or absolute URL
                if (
                    href.startsWith("data:") ||
                    href.match(/^(https?:\/\/|file:|\/)/) ||
                    href.startsWith("blob:")
                ) {
                    return `<img src="${href}" alt="${text || ""}" title="${title || ""}" />`;
                }

                // Extract the image filename from the href
                let imgFilename = href;

                // Handle URL-encoded characters in the filename
                try {
                    // Try to decode URL-encoded characters
                    imgFilename = decodeURIComponent(imgFilename);
                } catch (e) {
                    console.warn("Error decoding URL:", e);
                }

                // Remove any path information and just get the filename
                if (imgFilename.includes("/")) {
                    imgFilename = imgFilename.substring(imgFilename.lastIndexOf("/") + 1);
                }

                console.log("Looking for image:", imgFilename);

                // Check if we have this image in our loaded files
                if (imageFiles[imgFilename]) {
                    console.log(
                        `Using cached image for ${imgFilename}: ${imageFiles[imgFilename]}`
                    );
                    return `<img 
        src="${imageFiles[imgFilename]}" 
        alt="${text || ""}" 
        title="${title || ""}" 
        class="markdown-image"
      />`;
                }

                // Try alternative filenames (case insensitive match)
                const imgKeys = Object.keys(imageFiles);
                const matchedKey = imgKeys.find(
                    (key) => key.toLowerCase() === imgFilename.toLowerCase()
                );

                if (matchedKey) {
                    console.log(
                        `Found case-insensitive match for ${imgFilename}: ${matchedKey}`
                    );
                    return `<img 
        src="${imageFiles[matchedKey]}" 
        alt="${text || ""}" 
        title="${title || ""}" 
        class="markdown-image"
      />`;
                }

                // For relative paths, try to resolve them as a fallback
                let resolvedHref = href;

                // If we have a base path and it's a relative URL
                if (markdownFileBasePath) {
                    resolvedHref = markdownFileBasePath + href;
                    console.log("Original image href:", href);
                    console.log("Resolved image href:", resolvedHref);
                }

                // Add error handling for images that fail to load
                return `<img 
      src="${resolvedHref}" 
      alt="${text || ""}" 
      title="${title || ""}" 
      onerror="this.onerror=null; this.src='data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22 viewBox=%220 0 100 100%22%3E%3Crect width=%22100%22 height=%22100%22 fill=%22%23eee%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-family=%22sans-serif%22 font-size=%2212px%22 fill=%22%23999%22%3EImage not found%3C/text%3E%3C/svg%3E';" 
      class="markdown-image"
    />`;
            };

            marked.setOptions({
                breaks: true,
                gfm: true,
                renderer: renderer,
            });

            // Initialize image width settings
            updateImageWidth();

            // Event Listeners
            markdownFileInput.addEventListener("change", handleFileUpload);
            processBtn.addEventListener("click", processMarkdown);
            addCropPointBtn.addEventListener("click", addCropPoint);
            themeSelect.addEventListener("change", changeTheme);
            downloadAllBtn.addEventListener("click", downloadAllImages);
            h1LevelBtn.addEventListener("click", () => setHeadingLevelCrop(1));
            h2LevelBtn.addEventListener("click", () => setHeadingLevelCrop(2));
            h3LevelBtn.addEventListener("click", () => setHeadingLevelCrop(3));
            clearLevelBtn.addEventListener("click", clearHeadingLevelCrop);
            applyWatermarkBtn.addEventListener("click", applyWatermark);
            exportAllBtn.addEventListener("click", exportAllSections);

            // Image width settings event listeners
            imageWidthSelect.addEventListener("change", updateImageWidth);
            customImageWidth.addEventListener("change", updateCustomImageWidth);

            // Update rotation value display
            watermarkRotation.addEventListener("input", () => {
                rotationValue.textContent = `${watermarkRotation.value}°`;
            });

            // Update image width based on select dropdown
            function updateImageWidth() {
                const selectedValue = imageWidthSelect.value;
                if (selectedValue === "custom") {
                    customWidthContainer.style.display = "block";
                    imageWidth = parseInt(customImageWidth.value) || 800;
                } else {
                    customWidthContainer.style.display = "none";
                    imageWidth = parseInt(selectedValue) || 800;
                }
            }

            // Update image width from custom input
            function updateCustomImageWidth() {
                if (imageWidthSelect.value === "custom") {
                    imageWidth = parseInt(customImageWidth.value) || 800;
                }
            }

            // Functions
            function changeTheme() {
                // Remove all theme classes
                markdownPreview.classList.remove(
                    "theme-twitter",
                    "theme-linkedin",
                    "theme-medium",
                    "theme-github",
                    "theme-dark",
                    "theme-pinterest",
                    "theme-instagram",
                    "theme-apple-notes",
                    "theme-notion",
                    "theme-terminal",
                    "theme-gym",
                    "theme-energy"
                );

                // Add selected theme class if one is selected
                if (themeSelect.value) {
                    markdownPreview.classList.add(themeSelect.value);
                }
            }

            // Store references to image files
            let imageFiles = {};

            function handleFileUpload(e) {
                const file = e.target.files[0];
                if (!file) return;

                // Extract the directory name from the file path
                const filePath = file.name;
                const lastSlashIndex = filePath.lastIndexOf("/");
                const dirName =
                    lastSlashIndex !== -1 ? filePath.substring(0, lastSlashIndex + 1) : "";
                markdownFileBasePath = dirName;

                console.log("Markdown file path:", filePath);
                console.log("Base path for images:", markdownFileBasePath);

                // Read the markdown file first
                const reader = new FileReader();
                reader.onload = function(e) {
                    const content = e.target.result;
                    markdownTextArea.value = content;

                    // Extract image references from the markdown content
                    const imageRefs = extractImageReferences(content);

                    if (imageRefs.length > 0) {
                        console.log(`Found ${imageRefs.length} image references:`, imageRefs);

                        // Ask user to select the image files referenced in the markdown
                        const imageInput = document.createElement("input");
                        imageInput.type = "file";
                        imageInput.multiple = true;
                        imageInput.accept = "image/*";

                        // After reading the markdown, prompt for images
                        alert(
                            `Please select all ${imageRefs.length} image files referenced in your markdown document`
                        );
                        imageInput.click();

                        // Handle image file selection
                        imageInput.addEventListener("change", function(e) {
                            const selectedImages = e.target.files;

                            // Clear previous image cache
                            imageFiles = {};

                            // Process each selected image
                            for (let i = 0; i < selectedImages.length; i++) {
                                const imgFile = selectedImages[i];
                                const imgFileName = imgFile.name;

                                // Create a blob URL for the image
                                const blobUrl = URL.createObjectURL(imgFile);

                                // Store the mapping of filename to blob URL
                                imageFiles[imgFileName] = blobUrl;
                                console.log(`Loaded image: ${imgFileName} -> ${blobUrl}`);
                            }

                            // Process the markdown with the loaded images
                            processMarkdown();
                        });
                    } else {
                        // No images found, just process the markdown
                        processMarkdown();
                    }
                };
                reader.readAsText(file);
            }

            // Function to extract image references from markdown content
            function extractImageReferences(markdownContent) {
                const imageRefs = [];

                // Regular expression to match markdown image syntax: ![alt](path)
                const imageRegex = /!\[(.*?)\]\((.*?)\)/g;
                let match;

                while ((match = imageRegex.exec(markdownContent)) !== null) {
                    const imagePath = match[2];

                    // Skip external URLs
                    if (!imagePath.match(/^(https?:\/\/|data:|file:|\/)/)) {
                        // Extract just the filename if there's a path
                        const fileName = imagePath.includes("/") ?
                            imagePath.substring(imagePath.lastIndexOf("/") + 1) :
                            imagePath;

                        imageRefs.push({
                            path: imagePath,
                            fileName: fileName,
                        });
                    }
                }

                return imageRefs;
            }

            function processMarkdown() {
                markdownContent = markdownTextArea.value.trim();

                if (!markdownContent) {
                    alert("Please enter or upload markdown content");
                    return;
                }

                // Render markdown
                markdownPreview.innerHTML = marked.parse(markdownContent);

                // Find all headings in the rendered markdown
                findHeadings();

                // Show tools section
                toolsSection.style.display = "block";

                // Reset crop points and export sections
                cropPoints = [];
                activeHeadingLevel = null;

                // Clear active class from all buttons
                h1LevelBtn.classList.remove("active");
                h2LevelBtn.classList.remove("active");
                h3LevelBtn.classList.remove("active");

                // Add default crop point at the beginning
                addCropPoint();

                // Update export sections
                updateExportSections();
            }

            function findHeadings() {
                headings = [];
                const headingElements = markdownPreview.querySelectorAll(
                    "h1, h2, h3, h4, h5, h6"
                );

                // Add beginning of document as first option
                headings.push({
                    element: markdownPreview.firstChild,
                    text: "Beginning of document",
                    level: 0,
                    index: 0,
                });

                // Add all headings
                headingElements.forEach((el, index) => {
                    const level = parseInt(el.tagName.substring(1));
                    headings.push({
                        element: el,
                        text: el.textContent,
                        level: level,
                        index: index + 1,
                    });

                    // Add click event and crop indicator to each heading
                    addHeadingClickEvent(el, index + 1);
                });

                // Add end of document as last option
                headings.push({
                    element: null,
                    text: "End of document",
                    level: 0,
                    index: headings.length,
                });
            }

            function addHeadingClickEvent(headingElement, headingIndex) {
                // Add crop indicator
                const cropIndicator = document.createElement("span");
                cropIndicator.className = "crop-indicator";
                cropIndicator.innerHTML = "✂️";
                cropIndicator.title = "Click to add crop point";
                headingElement.style.position = "relative";
                headingElement.appendChild(cropIndicator);

                // Add click event to heading
                headingElement.addEventListener("click", (e) => {
                    // Add crop point at this heading
                    addCropPointAtHeading(headingIndex);
                    e.stopPropagation();
                });
            }

            function addCropPointAtHeading(headingIndex) {
                // Check if this crop point already exists
                const existingPoint = cropPoints.find(
                    (point) => point.headingIndex === headingIndex
                );
                if (existingPoint) {
                    // Remove it instead
                    const pointIndex = cropPoints.indexOf(existingPoint);
                    removeCropPoint(pointIndex);
                    return;
                }

                // Add the crop point
                cropPoints.push({
                    headingIndex: headingIndex,
                });

                // Update the UI
                updateCropPointsUI();
                updateExportSections();

                // Highlight the heading
                if (headingIndex > 0 && headingIndex < headings.length - 1) {
                    const heading = headings[headingIndex].element;
                    heading.classList.add("crop-point-active");
                }
            }

            function updateCropPointsUI() {
                // Clear the container
                cropPointsContainer.innerHTML = "";

                // Sort crop points by heading index
                cropPoints.sort((a, b) => a.headingIndex - b.headingIndex);

                // Add each crop point to the UI
                cropPoints.forEach((point, index) => {
                            const cropPointDiv = document.createElement("div");
                            cropPointDiv.className = "crop-point";
                            cropPointDiv.innerHTML = `
                <select id="crop-point-${index}" class="crop-point-select">
                    ${headings
                      .map((h, i) => {
                        const indent = "&nbsp;".repeat(h.level * 2);
                        return `<option value="${i}" ${
                          point.headingIndex === i ? "selected" : ""
                        }>${indent}${h.text}</option>`;
                      })
                      .join("")}
                </select>
                <button class="remove-crop-point" data-index="${index}">Remove</button>
            `;

      cropPointsContainer.appendChild(cropPointDiv);

      // Add event listener to the remove button
      const removeBtn = cropPointDiv.querySelector(".remove-crop-point");
      removeBtn.addEventListener("click", (e) => {
        const index = parseInt(e.target.getAttribute("data-index"));
        removeCropPoint(index);
      });

      // Add event listener to the select
      const select = cropPointDiv.querySelector(".crop-point-select");
      select.addEventListener("change", (e) => {
        const newHeadingIndex = parseInt(e.target.value);
        point.headingIndex = newHeadingIndex;
        updateExportSections();
        updateHeadingHighlights();
      });
    });
  }

  function updateHeadingHighlights() {
    // Clear all highlights
    headings.forEach((heading) => {
      if (heading.element) {
        heading.element.classList.remove("crop-point-active");
      }
    });

    // Add highlights to active crop points
    cropPoints.forEach((point) => {
      const heading = headings[point.headingIndex];
      if (heading && heading.element) {
        heading.element.classList.add("crop-point-active");
      }
    });
  }

  function setHeadingLevelCrop(level) {
    // Clear active class from all buttons
    h1LevelBtn.classList.remove("active");
    h2LevelBtn.classList.remove("active");
    h3LevelBtn.classList.remove("active");

    // If we're toggling the same level, clear it
    if (activeHeadingLevel === level) {
      activeHeadingLevel = null;
      clearHeadingLevelCrop();
      return;
    }

    // Set the active level
    activeHeadingLevel = level;

    // Add active class to the selected button
    if (level === 1) h1LevelBtn.classList.add("active");
    if (level === 2) h2LevelBtn.classList.add("active");
    if (level === 3) h3LevelBtn.classList.add("active");

    // Clear existing crop points
    cropPoints = [];

    // Add beginning of document
    cropPoints.push({
      headingIndex: 0,
    });

    // Add crop points at all headings of the selected level
    headings.forEach((heading, index) => {
      if (heading.level === level) {
        cropPoints.push({
          headingIndex: index,
        });
      }
    });

    // Update UI
    updateCropPointsUI();
    updateExportSections();
    updateHeadingHighlights();
  }

  function clearHeadingLevelCrop() {
    // Clear active class from all buttons
    h1LevelBtn.classList.remove("active");
    h2LevelBtn.classList.remove("active");
    h3LevelBtn.classList.remove("active");

    activeHeadingLevel = null;

    // Clear all crop points except the first one (beginning of document)
    cropPoints = [
      {
        headingIndex: 0,
      },
    ];

    // Update UI
    updateCropPointsUI();
    updateExportSections();
    updateHeadingHighlights();
  }

  function addCropPoint() {
    // Add a new crop point at the beginning of document
    addCropPointAtHeading(0);
  }

  function removeCropPoint(index) {
    // Get the heading index before removing
    const headingIndex = cropPoints[index]?.headingIndex;

    // Remove from array
    cropPoints.splice(index, 1);

    // Update UI
    updateCropPointsUI();
    updateExportSections();

    // Remove highlight from the heading
    if (
      headingIndex !== undefined &&
      headingIndex > 0 &&
      headingIndex < headings.length - 1
    ) {
      const heading = headings[headingIndex].element;
      if (heading) {
        heading.classList.remove("crop-point-active");
      }
    }
  }

  function updateExportSections() {
    // Ensure we have at least one crop point
    if (cropPoints.length === 0) {
      cropPoints.push({
        headingIndex: 0,
      });
      updateCropPointsUI();
    }

    // Sort crop points by heading index
    cropPoints.sort((a, b) => a.headingIndex - b.headingIndex);

    // Update export sections
    exportSectionsContainer.innerHTML = "";

    // Create sections based on crop points
    for (let i = 0; i < cropPoints.length - 1; i++) {
      const startHeadingIndex = cropPoints[i].headingIndex;
      const endHeadingIndex = cropPoints[i + 1].headingIndex;

      const startHeading = headings[startHeadingIndex];
      const endHeading = headings[endHeadingIndex];

      const sectionDiv = document.createElement("div");
      sectionDiv.className = "export-section";
      sectionDiv.innerHTML = `
                <div class="export-section-name">
                    Section ${i + 1}: ${startHeading.text} to ${endHeading.text}
                </div>
                <button class="export-section-btn" data-start="${startHeadingIndex}" data-end="${endHeadingIndex}">
                    Export This Section
                </button>
            `;

      exportSectionsContainer.appendChild(sectionDiv);

      // Add event listener to export button
      const exportBtn = sectionDiv.querySelector(".export-section-btn");
      exportBtn.addEventListener("click", (e) => {
        const start = parseInt(e.target.getAttribute("data-start"));
        const end = parseInt(e.target.getAttribute("data-end"));
        exportSection(start, end);
      });
    }
  }

  function applyWatermark() {
    // Get watermark settings
    watermarkSettings = {
      text: watermarkText.value,
      color: watermarkColor.value,
      opacity: parseFloat(watermarkOpacity.value),
      position: watermarkPosition.value,
      rotation: parseInt(watermarkRotation.value),
    };

    // Apply watermark to preview
    if (watermarkSettings.text) {
      watermarkApplied = true;
      showWatermark(markdownPreview);
      //   alert("Watermark applied! It will be included in exported images.");
    } else {
      alert("Please enter watermark text");
    }
  }

  function showWatermark(container) {
    // Remove any existing watermarks
    const existingWatermarks = container.querySelectorAll(
      ".watermark, .watermark-container"
    );
    existingWatermarks.forEach((el) => el.remove());

    // Apply rotation to the watermark text
    const rotationStyle = `rotate(${watermarkSettings.rotation}deg)`;

    // Handle repeating watermark differently
    if (watermarkSettings.position === "repeat") {
      // Create a container for the repeating watermarks
      const watermarkContainer = document.createElement("div");
      watermarkContainer.className = "watermark-container";
      watermarkContainer.style.position = "absolute";
      watermarkContainer.style.top = "0";
      watermarkContainer.style.left = "0";
      watermarkContainer.style.width = "100%";
      watermarkContainer.style.height = "100%";
      watermarkContainer.style.overflow = "hidden";
      watermarkContainer.style.pointerEvents = "none";
      watermarkContainer.style.zIndex = "1000";

      // Get the actual dimensions including scrollable area
      const containerWidth = container.offsetWidth || 750;
      // For scrollHeight, we need the full scrollable height, not just the visible part
      const containerHeight = container.scrollHeight || 1200;

      // Set the container to cover the entire scrollable area
      watermarkContainer.style.width = `${containerWidth}px`;
      watermarkContainer.style.height = `${containerHeight}px`;
      watermarkContainer.style.position = "absolute";
      watermarkContainer.style.top = "0";
      watermarkContainer.style.left = "0";

      // Create watermarks in a grid pattern covering the entire scrollable content
      const spacing = 150; // Space between watermarks
      for (let y = 0; y < containerHeight; y += spacing) {
        for (let x = 0; x < containerWidth; x += spacing) {
          const watermark = document.createElement("div");
          watermark.className = "watermark";
          watermark.textContent = watermarkSettings.text;
          watermark.style.position = "absolute";
          watermark.style.left = `${x}px`;
          watermark.style.top = `${y}px`;
          watermark.style.color = watermarkSettings.color;
          watermark.style.opacity = 0.1;
          watermark.style.fontSize = "24px";
          watermark.style.fontWeight = "bold";
          watermark.style.transform = rotationStyle;
          watermark.style.whiteSpace = "nowrap";
          watermarkContainer.appendChild(watermark);
        }
      }

      container.classList.add("watermarked");
      container.appendChild(watermarkContainer);
      return;
    }

    // For non-repeating watermarks, create a single watermark
    const watermark = document.createElement("div");
    watermark.className = "watermark";
    watermark.textContent = watermarkSettings.text;
    watermark.style.color = watermarkSettings.color;
    watermark.style.opacity = watermarkSettings.opacity;
    watermark.style.fontSize = "24px";
    watermark.style.fontWeight = "bold";
    watermark.style.padding = "10px";
    watermark.style.whiteSpace = "nowrap";

    // Position the watermark
    switch (watermarkSettings.position) {
      case "top-left":
        watermark.style.top = "10px";
        watermark.style.left = "10px";
        watermark.style.transform = rotationStyle;
        break;
      case "top-right":
        watermark.style.top = "10px";
        watermark.style.right = "10px";
        watermark.style.transform = rotationStyle;
        break;
      case "bottom-left":
        watermark.style.bottom = "10px";
        watermark.style.left = "10px";
        watermark.style.transform = rotationStyle;
        break;
      case "bottom-right":
        watermark.style.bottom = "10px";
        watermark.style.right = "10px";
        watermark.style.transform = rotationStyle;
        break;
      case "center":
        watermark.style.top = "50%";
        watermark.style.left = "50%";
        watermark.style.transform = `translate(-50%, -50%) ${rotationStyle}`;
        break;
    }

    // Add watermark to container
    container.classList.add("watermarked");
    container.appendChild(watermark);
  }

  function downloadAllImages() {
    // Check if there are any images to download
    const resultItems = document.querySelectorAll(".result-item");
    if (resultItems.length === 0) {
      alert("No images to download. Please export sections first.");
      return;
    }

    // Disable the download button and show progress
    const downloadBtn = document.getElementById("download-all-btn");
    const originalText = downloadBtn.textContent;
    downloadBtn.disabled = true;
    downloadBtn.textContent = "Preparing download...";

    // Create a zip file using JSZip
    const zip = new JSZip();
    const imgFolder = zip.folder("markdown-images");

    // Add all images to the zip file
    let processedCount = 0;
    let totalCanvases = 0;

    // First, count total canvases to process
    resultItems.forEach((resultItem) => {
      const canvas = resultItem.querySelector("canvas");
      if (canvas) {
        totalCanvases++;
      }
    });

    if (totalCanvases === 0) {
      alert("No canvas images found to download. Please export sections first.");
      return;
    }

    // Get current timestamp for consistent naming
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, "");
    
    resultItems.forEach((resultItem, index) => {
      const canvas = resultItem.querySelector("canvas");
      if (!canvas) return;

      // Get the section name from the result item
      const sectionNameEl = resultItem.querySelector(".export-section-name");
      let fileName = `markdown-section-${String(index + 1).padStart(2, '0')}.png`;

      if (sectionNameEl) {
        // Create a formatted filename from the section name
        const sectionName = sectionNameEl.textContent.trim();
        
        // Extract heading titles for better naming
        const headingMatch = sectionName.match(/^(.+?)\s+to\s+(.+)$/);
        if (headingMatch) {
          const [, startHeading, endHeading] = headingMatch;
          // Clean up heading text for filename
          const cleanStartHeading = startHeading
            .replace(/^(Section \d+:\s*)?/, '') // Remove "Section X:" prefix
            .replace(/[^\w\s-]/g, '') // Remove special characters except word chars, spaces, hyphens
            .replace(/\s+/g, '-') // Replace spaces with hyphens
            .toLowerCase()
            .substring(0, 50); // Limit length
          
          const cleanEndHeading = endHeading
            .replace(/[^\w\s-]/g, '') // Remove special characters except word chars, spaces, hyphens
            .replace(/\s+/g, '-') // Replace spaces with hyphens
            .toLowerCase()
            .substring(0, 50); // Limit length
          
          fileName = `${String(index + 1).padStart(2, '0')}-${cleanStartHeading}-to-${cleanEndHeading}.png`;
        } else {
          // Fallback: use the entire section name
          const cleanSectionName = sectionName
            .replace(/^(Section \d+:\s*)?/, '') // Remove "Section X:" prefix
            .replace(/[^\w\s-]/g, '') // Remove special characters
            .replace(/\s+/g, '-') // Replace spaces with hyphens
            .toLowerCase()
            .substring(0, 100); // Limit length
          
          fileName = `${String(index + 1).padStart(2, '0')}-${cleanSectionName}.png`;
        }
        
        // Ensure filename doesn't end with multiple hyphens
        fileName = fileName.replace(/-+/g, '-').replace(/-\.png$/, '.png');
      }

      // Convert canvas to blob
      canvas.toBlob((blob) => {
        if (blob) {
          imgFolder.file(fileName, blob);
        }
        processedCount++;

        // When all images are processed, generate and download the zip
        if (processedCount === totalCanvases) {
          downloadBtn.textContent = "Creating ZIP file...";
          
          zip.generateAsync({ type: "blob" }).then((content) => {
            // Create download link with formatted filename
            const link = document.createElement("a");
            link.href = URL.createObjectURL(content);
            link.download = `markdown-cropper-export-${timestamp}.zip`;
            link.click();

            // Clean up
            URL.revokeObjectURL(link.href);
            
            // Reset button state
            downloadBtn.disabled = false;
            downloadBtn.textContent = originalText;
            
            // Show success message
            alert(`Successfully downloaded ${totalCanvases} images as a ZIP file!`);
          }).catch((error) => {
            console.error("Error creating ZIP file:", error);
            
            // Reset button state
            downloadBtn.disabled = false;
            downloadBtn.textContent = originalText;
            
            alert("Error creating ZIP file. Please try again.");
          });
        }
      }, "image/png");
    });
  }

  function exportAllSections() {
    resultsSection.style.display = "block";
    resultsContainer.innerHTML = "";

    // Export each section
    for (let i = 0; i < cropPoints.length - 1; i++) {
      const startHeadingIndex = cropPoints[i].headingIndex;
      const endHeadingIndex = cropPoints[i + 1].headingIndex;
      exportSection(startHeadingIndex, endHeadingIndex);
    }
  }

  function exportSection(startHeadingIndex, endHeadingIndex) {
    const startHeading = headings[startHeadingIndex];
    const endHeading = headings[endHeadingIndex];

    // Extract the markdown content between the crop points
    const sectionMarkdown = extractContentBetweenHeadings(
      startHeadingIndex,
      endHeadingIndex
    );

    // Create a temporary container for rendering
    const tempContainer = document.createElement("div");

    // Apply the current theme class to the exported content
    const currentThemeClass = themeSelect.value;
    tempContainer.className = "markdown-content";
    if (currentThemeClass) {
      tempContainer.classList.add(currentThemeClass);
    }

    tempContainer.style.padding = "20px 40px";

    // Don't override background if a theme is applied
    if (!currentThemeClass) {
      tempContainer.style.background = "#fff";
    }

    // Use consistent image width from UI settings
    tempContainer.style.width = `${imageWidth}px`;
    tempContainer.style.position = "absolute";
    tempContainer.style.left = "-9999px";
    tempContainer.style.overflow = "visible";
    tempContainer.style.height = "auto";
    tempContainer.style.minHeight = "auto";

    // Render the markdown content
    tempContainer.innerHTML = marked.parse(sectionMarkdown);

    // Add watermark if applied
    if (watermarkApplied) {
      showWatermark(tempContainer);
    }

    // Add to document temporarily (needed for html2canvas)
    document.body.appendChild(tempContainer);

    // Wait for all images to load before capturing
    const images = tempContainer.querySelectorAll("img");
    let loadedImages = 0;
    const totalImages = images.length;

    function captureWhenReady() {
      // Force a reflow to ensure proper height calculation
      tempContainer.style.display = "none";
      tempContainer.offsetHeight; // Trigger reflow
      tempContainer.style.display = "block";

      // Get the actual content height after images are loaded
      const actualHeight = Math.max(
        tempContainer.scrollHeight,
        tempContainer.offsetHeight,
        tempContainer.clientHeight
      );

      // Add some extra padding to ensure nothing is cut off
      const finalHeight = actualHeight + 40;

      // Convert to image with proper height
      html2canvas(tempContainer, {
        backgroundColor: null,
        scale: 2,
        logging: false,
        width: imageWidth,
        height: finalHeight,
        windowWidth: imageWidth,
        windowHeight: finalHeight,
        scrollX: 0,
        scrollY: 0,
        useCORS: true,
        allowTaint: true,
        onclone: function (clonedDoc) {
          const clonedElement =
            clonedDoc.body.querySelector(".markdown-content");
          if (clonedElement) {
            clonedElement.style.width = `${imageWidth}px`;
            clonedElement.style.height = "auto";
            clonedElement.style.minHeight = "auto";
            clonedElement.style.overflow = "visible";
            clonedElement.style.position = "static";

            // Ensure all images in the clone are visible
            const clonedImages = clonedElement.querySelectorAll("img");
            clonedImages.forEach((img) => {
              img.style.maxWidth = "100%";
              img.style.height = "auto";
              img.style.display = "block";
            });
          }
        },
      })
        .then((canvas) => {
          // Remove temp container
          document.body.removeChild(tempContainer);

          // Create result item
          const resultItem = document.createElement("div");
          resultItem.className = "result-item";

          // Create section name
          const sectionName = document.createElement("div");
          sectionName.className = "export-section-name";
          sectionName.textContent = `${startHeading.text} to ${endHeading.text}`;

          // Add canvas with fixed width to ensure consistency
          canvas.style.width = `${imageWidth}px`;
          canvas.style.maxWidth = "100%";

          // Create download button
          const downloadBtn = document.createElement("button");
          downloadBtn.textContent = "Download PNG";
          downloadBtn.addEventListener("click", () => {
            // Generate formatted filename for individual download
            const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, "");
            let fileName = `markdown-section-${startHeadingIndex}-to-${endHeadingIndex}-${timestamp}.png`;
            
            // Create a better filename from heading text
            if (startHeading && endHeading) {
              const cleanStartHeading = startHeading.text
                .replace(/[^\w\s-]/g, '') // Remove special characters
                .replace(/\s+/g, '-') // Replace spaces with hyphens
                .toLowerCase()
                .substring(0, 50); // Limit length
              
              const cleanEndHeading = endHeading.text
                .replace(/[^\w\s-]/g, '') // Remove special characters
                .replace(/\s+/g, '-') // Replace spaces with hyphens
                .toLowerCase()
                .substring(0, 50); // Limit length
              
              fileName = `${cleanStartHeading}-to-${cleanEndHeading}-${timestamp}.png`;
              // Clean up multiple hyphens
              fileName = fileName.replace(/-+/g, '-').replace(/^-|-$/g, '');
            }
            
            const link = document.createElement("a");
            link.download = fileName;
            link.href = canvas.toDataURL("image/png");
            link.click();
          });

          // Add to result item
          resultItem.appendChild(sectionName);
          resultItem.appendChild(canvas);
          resultItem.appendChild(downloadBtn);

          // Add to results container
          resultsContainer.appendChild(resultItem);

          // Show results section
          resultsSection.style.display = "block";

          // Scroll to results
          resultsSection.scrollIntoView({ behavior: "smooth" });
        })
        .catch((error) => {
          console.error("Error capturing canvas:", error);
          document.body.removeChild(tempContainer);
        });
    }

    // If there are images, wait for them to load
    if (totalImages > 0) {
      images.forEach((img) => {
        if (img.complete) {
          loadedImages++;
        } else {
          img.onload = () => {
            loadedImages++;
            if (loadedImages === totalImages) {
              // Wait a bit more to ensure layout is stable
              setTimeout(captureWhenReady, 200);
            }
          };
          img.onerror = () => {
            loadedImages++;
            if (loadedImages === totalImages) {
              setTimeout(captureWhenReady, 200);
            }
          };
        }
      });

      // If all images are already loaded
      if (loadedImages === totalImages) {
        setTimeout(captureWhenReady, 200);
      }
    } else {
      // No images, capture immediately
      setTimeout(captureWhenReady, 100);
    }
  }

  function extractContentBetweenHeadings(startHeadingIndex, endHeadingIndex) {
    // Split the original markdown content by lines
    const lines = markdownContent.split("\n");

    // Find the line numbers where our headings are located
    let startLine = 0;
    let endLine = lines.length;

    // If not starting from the beginning, find the line of the start heading
    if (startHeadingIndex > 0) {
      const headingText = headings[startHeadingIndex].text;
      const headingLevel = headings[startHeadingIndex].level;
      const headingPrefix = "#".repeat(headingLevel) + " ";

      // Find the line that contains this heading
      for (let i = 0; i < lines.length; i++) {
        if (
          lines[i].trim().startsWith(headingPrefix) &&
          lines[i].includes(headingText)
        ) {
          startLine = i;
          break;
        }
      }
    }

    // If not ending at the end, find the line of the end heading
    if (endHeadingIndex < headings.length - 1) {
      const headingText = headings[endHeadingIndex].text;
      const headingLevel = headings[endHeadingIndex].level;
      const headingPrefix = "#".repeat(headingLevel) + " ";

      // Find the line that contains this heading
      for (let i = startLine + 1; i < lines.length; i++) {
        if (
          lines[i].trim().startsWith(headingPrefix) &&
          lines[i].includes(headingText)
        ) {
          endLine = i;
          break;
        }
      }
    }

    // Extract the lines between start and end
    const sectionLines = lines.slice(startLine, endLine);
    console.log(sectionLines);
    // Join the lines back into a single string
    return sectionLines.join("\n");
  }
});