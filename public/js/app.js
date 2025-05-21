document.addEventListener('DOMContentLoaded', function() {
  // Generate a session ID for this user session
  const sessionId = generateUUID();
  
  // Setup for Merge PDFs
  setupMergePDFs(sessionId);
  
  // Setup for Split PDF
  setupSplitPDF(sessionId);
  
  // Setup for Compress PDF
  setupCompressPDF(sessionId);
  
  // Setup smooth scrolling for navigation links
  setupSmoothScrolling();

  // Handle file uploads and form submissions
  const forms = document.querySelectorAll('form');
  forms.forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const endpoint = form.getAttribute('action');
      
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
          if (Array.isArray(result.files)) {
            // Handle multiple files (e.g., PDF to Image conversion)
            result.files.forEach(file => {
              const link = document.createElement('a');
              link.href = `/download/${file.split('/').pop()}`;
              link.download = file.split('/').pop();
              link.textContent = 'Download Converted File';
              form.appendChild(link);
            });
          } else {
            // Handle single file
            const link = document.createElement('a');
            link.href = `/download/${result.file.split('/').pop()}`;
            link.download = result.file.split('/').pop();
            link.textContent = 'Download Converted File';
            form.appendChild(link);
          }
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        alert('Error: ' + error.message);
      }
    });
  });

  // Handle file input changes
  const fileInputs = document.querySelectorAll('input[type="file"]');
  fileInputs.forEach(input => {
    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file && file.type !== 'application/pdf') {
        alert('Please select a PDF file');
        e.target.value = '';
      }
    });
  });

  // Handle multiple file selection for merge
  const mergeInput = document.querySelector('input[name="pdfs"]');
  if (mergeInput) {
    mergeInput.addEventListener('change', (e) => {
      const files = Array.from(e.target.files);
      const nonPdfFiles = files.filter(file => file.type !== 'application/pdf');
      if (nonPdfFiles.length > 0) {
        alert('Please select only PDF files');
        e.target.value = '';
      }
    });
  }

  // Handle page selection for split and delete
  const pageInputs = document.querySelectorAll('input[name="pages"]');
  pageInputs.forEach(input => {
    input.addEventListener('input', (e) => {
      const value = e.target.value;
      if (!/^[\d,]*$/.test(value)) {
        e.target.value = value.replace(/[^\d,]/g, '');
      }
    });
  });

  // Handle angle selection for rotate
  const angleInput = document.querySelector('input[name="angle"]');
  if (angleInput) {
    angleInput.addEventListener('input', (e) => {
      const value = e.target.value;
      if (!/^-?\d*$/.test(value)) {
        e.target.value = value.replace(/[^\d-]/g, '');
      }
    });
  }
});

/**
 * Generate a UUID for session tracking
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Format file size for display
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Setup for Merge PDFs feature
 */
function setupMergePDFs(sessionId) {
  const dropArea = document.getElementById('mergeDropArea');
  const fileInput = document.getElementById('mergePdfInput');
  const fileList = document.getElementById('mergeFileList');
  const startButton = document.getElementById('startMerge');
  const clearButton = document.getElementById('clearMerge');
  const resultArea = document.getElementById('mergeResult');
  const downloadLink = document.getElementById('mergeDownloadLink');
  const loadingArea = document.getElementById('mergeLoading');
  
  let files = [];
  
  // Setup drag and drop
  setupDragAndDrop(dropArea, fileInput, handleMergeFiles);
  
  // Handle file selection
  fileInput.addEventListener('change', function() {
    handleMergeFiles(Array.from(this.files));
  });
  
  // Handle merge button click
  startButton.addEventListener('click', function() {
    if (files.length < 2) {
      alert('Please select at least 2 PDF files to merge.');
      return;
    }
    
    // Show loading state
    loadingArea.style.display = 'block';
    resultArea.style.display = 'none';
    
    // Create form data
    const formData = new FormData();
    formData.append('sessionId', sessionId);
    
    files.forEach(file => {
      formData.append('pdfFiles', file);
    });
    
    // Send request to server
    fetch('/pdf/merge', {
      method: 'POST',
      body: formData
    })
    .then(response => response.json())
    .then(data => {
      loadingArea.style.display = 'none';
      
      if (data.success) {
        resultArea.style.display = 'block';
        downloadLink.href = data.downloadUrl;
      } else {
        alert('Error: ' + (data.error || 'Failed to merge PDFs'));
      }
    })
    .catch(error => {
      loadingArea.style.display = 'none';
      alert('Error: ' + error.message);
    });
  });
  
  // Handle clear button click
  clearButton.addEventListener('click', function() {
    clearMergeFiles();
  });
  
  // Handle file selection for merging
  function handleMergeFiles(newFiles) {
    // Filter for only PDF files
    const pdfFiles = newFiles.filter(file => file.type === 'application/pdf');
    
    if (pdfFiles.length === 0) {
      alert('Please select only PDF files.');
      return;
    }
    
    // Add files to the list
    files = [...files, ...pdfFiles];
    updateMergeFileList();
    
    // Enable/disable buttons
    startButton.disabled = files.length < 2;
    clearButton.disabled = files.length === 0;
  }
  
  // Update the file list display
  function updateMergeFileList() {
    fileList.innerHTML = '';
    
    files.forEach((file, index) => {
      const fileItem = document.createElement('div');
      fileItem.className = 'file-item';
      fileItem.innerHTML = `
        <div class="file-icon">
          <i class="fas fa-file-pdf"></i>
        </div>
        <div class="file-info">
          <div class="file-name">${file.name}</div>
          <div class="file-size">${formatFileSize(file.size)}</div>
        </div>
        <button class="remove-file" data-index="${index}">
          <i class="fas fa-times"></i>
        </button>
      `;
      fileList.appendChild(fileItem);
      
      // Add event listener for remove button
      fileItem.querySelector('.remove-file').addEventListener('click', function() {
        const index = parseInt(this.getAttribute('data-index'));
        files.splice(index, 1);
        updateMergeFileList();
        
        // Enable/disable buttons
        startButton.disabled = files.length < 2;
        clearButton.disabled = files.length === 0;
      });
    });
  }
  
  // Clear all selected files
  function clearMergeFiles() {
    files = [];
    fileList.innerHTML = '';
    startButton.disabled = true;
    clearButton.disabled = true;
    resultArea.style.display = 'none';
    fileInput.value = '';
  }
}

/**
 * Setup for Split PDF feature
 */
function setupSplitPDF(sessionId) {
  const dropArea = document.getElementById('splitDropArea');
  const fileInput = document.getElementById('splitPdfInput');
  const fileInfo = document.getElementById('splitFileInfo');
  const fileName = document.getElementById('splitFileName');
  const totalPages = document.getElementById('splitTotalPages');
  const removeButton = document.getElementById('removeSplitFile');
  const optionsArea = document.getElementById('splitOptions');
  const pageRangesInput = document.getElementById('pageRanges');
  const startButton = document.getElementById('startSplit');
  const clearButton = document.getElementById('clearSplit');
  const resultArea = document.getElementById('splitResult');
  const downloadLinks = document.getElementById('splitDownloadLinks');
  const loadingArea = document.getElementById('splitLoading');
  
  let selectedFile = null;
  
  // Setup drag and drop
  setupDragAndDrop(dropArea, fileInput, handleSplitFile);
  
  // Handle file selection
  fileInput.addEventListener('change', function() {
    if (this.files.length > 0) {
      handleSplitFile(this.files[0]);
    }
  });
  
  // Handle remove button click
  removeButton.addEventListener('click', function() {
    clearSplitFile();
  });
  
  // Handle split button click
  startButton.addEventListener('click', function() {
    if (!selectedFile) {
      alert('Please select a PDF file to split.');
      return;
    }
    
    const pageRanges = pageRangesInput.value.trim();
    if (!pageRanges) {
      alert('Please specify the page ranges to extract.');
      return;
    }
    
    // Validate page ranges format (e.g., 1-3,5,7-9)
    const rangePattern = /^(\d+(-\d+)?)(,\d+(-\d+)?)*$/;
    if (!rangePattern.test(pageRanges)) {
      alert('Invalid page range format. Please use format like: 1-3,5,7-9');
      return;
    }
    
    // Show loading state
    loadingArea.style.display = 'block';
    resultArea.style.display = 'none';
    
    // Create form data
    const formData = new FormData();
    formData.append('sessionId', sessionId);
    formData.append('pdfFile', selectedFile);
    formData.append('pages', pageRanges);
    
    // Send request to server
    fetch('/pdf/split', {
      method: 'POST',
      body: formData
    })
    .then(response => response.json())
    .then(data => {
      loadingArea.style.display = 'none';
      
      if (data.success) {
        resultArea.style.display = 'block';
        
        // Create download links for each split PDF
        downloadLinks.innerHTML = '';
        data.downloadUrls.forEach((url, index) => {
          const link = document.createElement('a');
          link.href = url;
          link.className = 'btn btn-success mb-2 me-2';
          link.innerHTML = `<i class="fas fa-download"></i> Download Part ${index + 1}`;
          downloadLinks.appendChild(link);
        });
      } else {
        alert('Error: ' + (data.error || 'Failed to split PDF'));
      }
    })
    .catch(error => {
      loadingArea.style.display = 'none';
      alert('Error: ' + error.message);
    });
  });
  
  // Handle clear button click
  clearButton.addEventListener('click', function() {
    clearSplitFile();
  });
  
  // Handle file selection for splitting
  function handleSplitFile(file) {
    if (file.type !== 'application/pdf') {
      alert('Please select a PDF file.');
      return;
    }
    
    selectedFile = file;
    
    // Display file info
    fileInfo.style.display = 'block';
    fileName.textContent = file.name;
    
    // Use dummy total pages for now (would need a backend operation to get actual page count)
    totalPages.textContent = '...';
    
    // Show options
    optionsArea.style.display = 'block';
    
    // Enable buttons
    startButton.disabled = false;
    clearButton.disabled = false;
  }
  
  // Clear selected file
  function clearSplitFile() {
    selectedFile = null;
    fileInfo.style.display = 'none';
    optionsArea.style.display = 'none';
    resultArea.style.display = 'none';
    startButton.disabled = true;
    clearButton.disabled = true;
    fileInput.value = '';
    pageRangesInput.value = '';
  }
}

/**
 * Setup for Compress PDF feature
 */
function setupCompressPDF(sessionId) {
  const dropArea = document.getElementById('compressDropArea');
  const fileInput = document.getElementById('compressPdfInput');
  const fileInfo = document.getElementById('compressFileInfo');
  const fileName = document.getElementById('compressFileName');
  const fileSize = document.getElementById('compressFileSize');
  const removeButton = document.getElementById('removeCompressFile');
  const optionsArea = document.getElementById('compressOptions');
  const startButton = document.getElementById('startCompress');
  const clearButton = document.getElementById('clearCompress');
  const resultArea = document.getElementById('compressResult');
  const downloadLink = document.getElementById('compressDownloadLink');
  const loadingArea = document.getElementById('compressLoading');
  const originalSizeEl = document.getElementById('originalSize');
  const compressedSizeEl = document.getElementById('compressedSize');
  const reductionPercentEl = document.getElementById('reductionPercent');
  
  let selectedFile = null;
  
  // Setup drag and drop
  setupDragAndDrop(dropArea, fileInput, handleCompressFile);
  
  // Handle file selection
  fileInput.addEventListener('change', function() {
    if (this.files.length > 0) {
      handleCompressFile(this.files[0]);
    }
  });
  
  // Handle remove button click
  removeButton.addEventListener('click', function() {
    clearCompressFile();
  });
  
  // Handle compress button click
  startButton.addEventListener('click', function() {
    if (!selectedFile) {
      alert('Please select a PDF file to compress.');
      return;
    }
    
    // Get selected quality
    const qualityOptions = document.getElementsByName('compressQuality');
    let quality = 'medium';
    for (const option of qualityOptions) {
      if (option.checked) {
        quality = option.value;
        break;
      }
    }
    
    // Show loading state
    loadingArea.style.display = 'block';
    resultArea.style.display = 'none';
    
    // Create form data
    const formData = new FormData();
    formData.append('sessionId', sessionId);
    formData.append('pdfFile', selectedFile);
    formData.append('quality', quality);
    
    // Send request to server
    fetch('/pdf/compress', {
      method: 'POST',
      body: formData
    })
    .then(response => response.json())
    .then(data => {
      loadingArea.style.display = 'none';
      
      if (data.success) {
        resultArea.style.display = 'block';
        downloadLink.href = data.downloadUrl;
        
        // Display compression stats
        originalSizeEl.textContent = formatFileSize(data.originalSize);
        compressedSizeEl.textContent = formatFileSize(data.compressedSize);
        
        const reduction = 100 - ((data.compressedSize / data.originalSize) * 100);
        reductionPercentEl.textContent = reduction.toFixed(1) + '%';
      } else {
        alert('Error: ' + (data.error || 'Failed to compress PDF'));
      }
    })
    .catch(error => {
      loadingArea.style.display = 'none';
      alert('Error: ' + error.message);
    });
  });
  
  // Handle clear button click
  clearButton.addEventListener('click', function() {
    clearCompressFile();
  });
  
  // Handle file selection for compressing
  function handleCompressFile(file) {
    if (file.type !== 'application/pdf') {
      alert('Please select a PDF file.');
      return;
    }
    
    selectedFile = file;
    
    // Display file info
    fileInfo.style.display = 'block';
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
    
    // Show options
    optionsArea.style.display = 'block';
    
    // Enable buttons
    startButton.disabled = false;
    clearButton.disabled = false;
  }
  
  // Clear selected file
  function clearCompressFile() {
    selectedFile = null;
    fileInfo.style.display = 'none';
    optionsArea.style.display = 'none';
    resultArea.style.display = 'none';
    startButton.disabled = true;
    clearButton.disabled = true;
    fileInput.value = '';
  }
}

/**
 * Setup drag and drop functionality for PDF uploads
 */
function setupDragAndDrop(dropArea, fileInput, handleFiles) {
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
  });
  
  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }
  
  ['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, highlight, false);
  });
  
  ['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, unhighlight, false);
  });
  
  function highlight() {
    dropArea.classList.add('dragover');
  }
  
  function unhighlight() {
    dropArea.classList.remove('dragover');
  }
  
  dropArea.addEventListener('drop', function(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    
    if (files.length > 0) {
      if (typeof handleFiles === 'function') {
        handleFiles(Array.from(files));
      }
    }
  });
  
  dropArea.addEventListener('click', function() {
    fileInput.click();
  });
}

/**
 * Setup smooth scrolling for navigation links
 */
function setupSmoothScrolling() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      
      const targetId = this.getAttribute('href');
      const targetElement = document.querySelector(targetId);
      
      if (targetElement) {
        window.scrollTo({
          top: targetElement.offsetTop - 80,
          behavior: 'smooth'
        });
        
        // If it's a tab, activate it
        if (targetId === '#merge' || targetId === '#split' || targetId === '#compress') {
          const tabId = targetId.substring(1) + '-tab';
          const tab = document.getElementById(tabId);
          if (tab) {
            tab.click();
          }
        }
      }
    });
  });
}