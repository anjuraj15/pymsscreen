import axios from 'axios';

// Dynamically load backend URL from environment
const API_BASE = import.meta.env.VITE_API_URL;

export const saveState = (state) => {
  return axios.post(`${API_BASE}/save_state`, state);
};

export const loadState = (payload) => {
  return axios.post(`${API_BASE}/load_state`, payload);
};

export const generateTable = (payload) => {
  return axios.post(`${API_BASE}/generate_table`, payload, {
    headers: {
      'Content-Type': 'application/json',
    }
  });
};

export const saveExtractConfig = async (config) => {
  return axios.post(`${API_BASE}/save_extract_config`, config);
};

export const loadExtractionConfig = async (workingDir) => {
  try {
    const params = new URLSearchParams({ working_directory: workingDir });
    const res = await axios.get(`${API_BASE}/load_extraction_config`, { params });
    return parseFloat(res.data.ret_time_shift_tol) || 0.5;
  } catch {
    return 0.5;
  }
};

export const extractData = (payload) => {
  return axios.post(`${API_BASE}/extract_data`, payload, {
    headers: {
      'Content-Type': 'application/json',
    }
  });
};

export const prescreenData = (payload) => {
  return axios.post(`${API_BASE}/prescreen_data`, payload, {
    headers: {
      'Content-Type': 'application/json',
    }
  });
};

export const loadComprehensiveTable = async (workingDirectory) => {
  return axios.get(`${API_BASE}/load_comprehensive_table`, {
    params: { working_directory: workingDirectory }
  });
};

export const exportSummaryPDF = async (compounds, working_directory) => {
  const payload = {
    working_directory,
    compound_groups: compounds.reduce((groups, compound) => {
      const group = groups.find(g => g.group_name === compound.ID);
      if (group) {
        group.compounds.push(compound);
      } else {
        groups.push({
          group_name: compound.ID,
          compounds: [compound]
        });
      }
      return groups;
    }, [])
  };

  try {
    const response = await axios.post(`${API_BASE}/export_summary_pdf`, payload, {
      responseType: 'blob'
    });
    return response.data;
  } catch (error) {
    console.error('PDF export failed:', error);
    throw new Error('PDF export failed');
  }
};

export const saveQAFlags = (working_directory, flags) => {
  return axios.post(`${API_BASE}/save_qa_flags`, {
    working_directory,
    flags
  });
};
