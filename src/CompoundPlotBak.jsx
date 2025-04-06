import React, { useEffect, useState } from 'react';
import Plot from 'react-plotly.js';
import Papa from 'papaparse';
import axios from 'axios';
import { useAppState } from '../context/AppStateContext';
import SmilesDrawer from 'smiles-drawer';

const parsePeakList = (peakStr) => {
  return peakStr.split(';').map((pair) => {
    const [mz, intensity] = pair.split(':').map(Number);
    return { x: mz, y: intensity };
  }).filter(p => !isNaN(p.x) && !isNaN(p.y));
};

const loadCSV = async (compoundId, type, tag, adduct, workingDir) => {
  const params = new URLSearchParams({
    working_directory: workingDir,
    compound_id: compoundId,
    type,
    tag,
    adduct,
  });
  const res = await axios.get(`http://localhost:5000/get_csv?${params}`);
  return new Promise((resolve) => {
    Papa.parse(res.data, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => resolve(results.data),
    });
  });
};

const CompoundPlot = ({ compoundId, tag, adduct }) => {
  const { appState } = useAppState();
  const [plots, setPlots] = useState([]);
  const [smiles, setSmiles] = useState('');

  useEffect(() => {
    const fetchSmiles = async () => {
      const res = await axios.get('http://localhost:5000/load_comprehensive_table', {
        params: { working_directory: appState.working_directory },
      });
      const match = res.data.find(row => row.ID == compoundId && row.tag === tag && row.adduct === adduct);
      if (match?.SMILES) setSmiles(match.SMILES);
    };
    if (compoundId && tag && adduct && appState?.working_directory) {
      fetchSmiles();
    }
  }, [compoundId, tag, adduct, appState]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const ms1Data = await loadCSV(compoundId, 'EIC', tag, adduct, appState.working_directory);
        const ms2Data = await loadCSV(compoundId, 'MS2', tag, adduct, appState.working_directory);

        const rtMin = Math.min(...ms1Data.map(row => parseFloat(row.rt)));
        const rtMax = Math.max(...ms1Data.map(row => parseFloat(row.rt)));

        const ms1Trace = {
          x: ms1Data.map(row => parseFloat(row.rt)),
          y: ms1Data.map(row => parseFloat(row.intensity)),
          mode: 'lines',
          name: 'MS1 EIC',
          line: { color: 'deepskyblue' }
        };

        const topMS2 = ms2Data.reduce((a, b) => parseFloat(a.ms2_intensity) > parseFloat(b.ms2_intensity) ? a : b);

        const ms2LineTrace = {
          x: [topMS2.ms2_rt, topMS2.ms2_rt],
          y: [0, parseFloat(topMS2.ms2_intensity)],
          mode: 'lines',
          name: 'MS2 RT',
          line: { color: 'mediumseagreen', width: 2, dash: 'dot' }
        };

        const fragmentData = parsePeakList(topMS2.peak_list);
        const fragmentTrace = {
          x: fragmentData.map(d => d.x),
          y: fragmentData.map(d => d.y),
          type: 'bar',
          marker: { color: 'mediumorchid' },
          name: `Fragments (scan=${topMS2.scan_id})`
        };

        setPlots([
          {
            layout: {
              title: 'MS1 EIC',
              xaxis: { title: 'RT', range: [rtMin, rtMax] },
              yaxis: { title: 'Intensity', tickformat: '.1e' }
            },
            data: [ms1Trace]
          },
          {
            layout: {
              title: 'MS2 Trigger RT',
              xaxis: { title: 'RT', range: [rtMin, rtMax] },
              yaxis: { title: 'Intensity', tickformat: '.1e' }
            },
            data: [ms2LineTrace]
          },
          {
            layout: {
              title: 'MS2 Fragment Spectrum',
              xaxis: { title: 'm/z' },
              yaxis: { title: 'Intensity', tickformat: '.1e' }
            },
            data: [fragmentTrace]
          },
        ]);
      } catch (e) {
        console.error('Error loading data:', e);
      }
    };

    if (compoundId && tag && adduct && appState?.working_directory) {
      fetchData();
    }
  }, [compoundId, tag, adduct, appState]);

  useEffect(() => {
    if (!smiles) return;
    const drawer = new SmilesDrawer.Drawer({ width: 200, height: 200 });
    SmilesDrawer.parse(smiles, tree => {
      drawer.draw(tree, 'smiles-canvas', 'light');
    });
  }, [smiles]);

  return (
    <div className="flex w-full h-full overflow-y-auto gap-4">
      <div className="flex flex-col flex-1 gap-6">
        {plots.map((plot, idx) => (
          <Plot key={idx} data={plot.data} layout={{ ...plot.layout, autosize: true }} useResizeHandler className="w-full h-[300px]" />
        ))}
      </div>
      <div className="w-[220px]">
        <canvas id="smiles-canvas" width="200" height="200" className="border rounded shadow" />
      </div>
    </div>
  );
};

export default CompoundPlot;
