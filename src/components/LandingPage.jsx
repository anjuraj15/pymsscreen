import { useState, useEffect } from 'react';
import { uploadFile, saveState, loadStateFromFile, generateTable  } from '../api/api';
import { useAppState } from '../context/AppStateContext';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
  const { appState, updateAppState } = useAppState();
  const navigate = useNavigate();

  const [compoundCSV, setCompoundCSV] = useState(null);
  const [mzmlFiles, setMzmlFiles] = useState([]);
  const [tags, setTags] = useState({});
  const [adductSelections, setAdductSelections] = useState({});
  const [draggedRowIndex, setDraggedRowIndex] = useState(null);
  const [uploading, setUploading] = useState(false);

  const adducts = [
    '[M+H]+', '[M+Na]+', '[M+K]+', '[M-H]-', '[M+NH4]+',
    '[M+CH3OH+H]+', '[M+ACN+H]+', '[M+ACN+Na]+', '[M+2ACN+H]+',
    '[M+Cl]-', '[M+HCOO]-', '[M+CH3COO]-'
  ];

  
  const handleCompoundCsvUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      await uploadFile(file);
      setCompoundCSV(file);
      alert('✅ Compound CSV uploaded!');
    } catch (err) {
      console.error('Compound CSV upload failed:', err);
      alert('❌ Failed to upload Compound CSV.');
    }
  };

  // Upload multiple mzML files immediately
  const handleMzmlUpload = async (e) => {
    setUploading(true); 
    const files = Array.from(e.target.files);
    const uploadedFiles = [];

    for (let file of files) {
      const formData = new FormData();
      formData.append('file', file);

      try {
        await uploadFile(file);
        uploadedFiles.push({ name: file.name });
      } catch (err) {
        console.error('mzML upload failed for', file.name, err);
      }
    }

    setMzmlFiles(prev => [...prev, ...uploadedFiles]);
    alert('✅ mzML files uploaded!');
    setUploading(false);
  };
  const handleSaveState = async () => {
    const compoundName = compoundCSV?.name || '';
    const mzmlData = mzmlFiles.map(file => ({
      file: file.name,
      tag: tags[file.name] || '',
      adduct: adductSelections[file.name] || '[M+H]+'
    }));

    const updatedState = {
      compound_csv: compoundName,
      mzml_files: mzmlData
    };

    try {
      const response = await saveState(updatedState);
      const blob = new Blob([response.data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'state.json';
      document.body.appendChild(a);
      a.click();
      a.remove();

      updateAppState(updatedState);
      alert('✅ State saved and downloaded!');
    } catch (err) {
      console.error('Save state failed:', err);
      alert('❌ Failed to save state.');
    }
  };

  const handleLoadState = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await loadStateFromFile(file);
      const data = await response.json();

      updateAppState(data);
      setCompoundCSV({ name: data.compound_csv });
      const files = data.mzml_files.map(f => ({ name: f.file }));
      setMzmlFiles(files);

      const loadedTags = {};
      const loadedAdducts = {};
      data.mzml_files.forEach(f => {
        loadedTags[f.file] = f.tag;
        loadedAdducts[f.file] = f.adduct;
      });
      setTags(loadedTags);
      setAdductSelections(loadedAdducts);

      alert('✅ State loaded successfully!');
    } catch (err) {
      console.error('Load state failed:', err);
      alert('❌ Failed to load state.');
    }
  };

  const handleGenerateTable = async () => {
    try {
      const response = await generateTable();
      const blob = new Blob([response.data], { type: 'text/csv' }); 
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'comprehensive_table.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();

      alert('✅ Table generated and downloaded!');
    } catch (err) {
      console.error('Generate table failed:', err);
      alert('❌ Failed to generate table.');
    }
  };

  const handleDeleteRow = (fileName) => {
    setMzmlFiles(prev => prev.filter(file => file.name !== fileName));
    setTags(prev => {
      const updated = { ...prev };
      delete updated[fileName];
      return updated;
    });
    setAdductSelections(prev => {
      const updated = { ...prev };
      delete updated[fileName];
      return updated;
    });
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#e0f4f7', fontFamily: 'sans-serif' }}>
      <div className="header" style={{ textAlign: 'center', backgroundColor: '#f0f0f0', padding: '20px' }}>
        <img src="/images/Title.jpg" alt="Title Image" style={{ maxWidth: '100%', height: '350px', margin: 'auto' }} />
        <h1>Mass Spectrometry Data Pre-screening</h1>
      </div>

      <div className="intro" style={{ padding: '20px', textAlign: 'center' }}>
        <p>
          An application intended to give the user a first look into raw mass-spectrometry data. This currently means that,
          given the input of data files and a list of masses of known or unknown compounds, the application is going to
          produce MS1 and MS2 chromatograms of the substances in the list, as well as the MS2 spectra.
        </p>
      </div>

      <div className="data-config" style={{
        padding: '20px', backgroundColor: '#ffffff', margin: '20px auto', borderRadius: '12px',
        boxShadow: '0 6px 12px rgba(0, 0, 0, 0.15)', border: '2px solid #cceeff', maxWidth: '90%', width: 'fit-content'
      }}>
        <h2>Data Configuration</h2>

        <div style={{ marginBottom: '10px' }}>
          <details style={{ background: '#f0faff', padding: '10px', borderRadius: '8px', border: '1px solid #cceeff' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>ℹ️ Instructions</summary>
            <ol style={{ paddingLeft: '20px', marginTop: '10px' }}>
              <li>Set the <strong>Working Directory</strong> by pasting the full path containing the Compound CSV and mzML files.</li>
              <li>Upload the <strong>Compound CSV</strong> (should include <em>ID</em>, <em>Name</em>, <em>SMILES</em> — or <em>ID</em> and <em>mz</em> for suspect screening).</li>
              <li>Upload one or more <strong>mzML Files</strong>.</li>
              <li>Edit <strong>Tags</strong> (unique labels for each file) and select the appropriate <strong>Adduct</strong>.</li>
              <li>Click <strong>"Save State"</strong> to store the configuration, and <strong>"Generate Table"</strong> to proceed.</li>
              <li><em>Optional:</em> If the same working directory is specified, click <strong>"Load State"</strong> to retrieve your previously saved configuration.</li>
              <li>Once the table is successfully generated, proceed to the <strong>Extraction & Prescreening</strong> step.</li>
            </ol>
          </details>
        </div>

        <label>Upload Compound CSV:</label>
        <input type="file" accept=".csv" onChange={handleCompoundCsvUpload} />

        <label>Upload mzML Files:</label>
        <input type="file" accept=".mzML" multiple onChange={handleMzmlUpload} />

        {uploading && (
          <div style={{color: 'blue', fontWeight: 'bold', marginTop: '10px'}}>
           Uploading files... please wait.
          </div>
        )}

      </div>

      <table style={{ width: '90%', margin: 'auto', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#f2f2f2' }}>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>File Name</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Adduct</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Tag</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {mzmlFiles.map((file, idx) => (
            <tr 
              key={idx}
              draggable
              onDragStart={() => setDraggedRowIndex(idx)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                const updatedFiles = [...mzmlFiles];
                const dragged = updatedFiles.splice(draggedRowIndex, 1)[0];
                updatedFiles.splice(idx, 0, dragged);
                setMzmlFiles(updatedFiles);
              }}
              style={{ border: '1px solid #ddd', padding: '8px', cursor: 'move' }}
             >
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{file.name}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                <select
                  value={adductSelections[file.name] || ''}
                  onChange={(e) => setAdductSelections(prev => ({ ...prev, [file.name]: e.target.value }))}
                  style={{ width: '100%', padding: '5px' }}
                >
                  {adducts.map((adduct, i) => (
                    <option key={i} value={adduct}>{adduct}</option>
                  ))}
                </select>
              </td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                <input
                  type="text"
                  value={tags[file.name] || ''}
                  onChange={(e) => setTags(prev => ({ ...prev, [file.name]: e.target.value }))}
                  style={{ width: '100%', padding: '5px' }}
                />
              </td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>
		              <button onClick={() => handleDeleteRow(file.name)} style={{ color: 'red' }}>Delete</button>
	            </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: 'flex', justifyContent: 'flex-start', maxWidth: '90%', margin: '20px auto' }}>
        <button onClick={handleSaveState} style={{ padding: '10px 15px', marginRight: '5px', borderRadius: '5px', background: 'linear-gradient(to bottom, #a7cce5, #bfe1f2)' }}>Save State</button>
        <input type="file" accept="application/json" onChange={handleLoadState} style={{ padding: '10px 15px', marginRight: '5px', borderRadius: '5px', background: 'linear-gradient(to bottom, #a7cce5, #bfe1f2)' }}></input>
        <button onClick={handleGenerateTable} style={{ padding: '10px 15px', borderRadius: '5px', background: 'linear-gradient(to bottom, #a7cce5, #bfe1f2)' }}>Generate Table</button>
      </div>

      <div style={{ textAlign: 'right', maxWidth: '90%', margin: 'auto', marginTop: '20px' }}>
        <button onClick={() => navigate('/extraction')} style={{ padding: '10px 15px', borderRadius: '5px', background: 'linear-gradient(to bottom, #a7cce5, #bfe1f2)' }}>
          Go to Extraction & Prescreening
        </button>
      </div>
    </div>
  );
};

export default LandingPage;
