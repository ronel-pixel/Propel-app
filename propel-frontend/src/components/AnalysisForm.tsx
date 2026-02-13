import React, { useState } from 'react';
import axios from 'axios';
import { auth } from '../firebase';

interface AnalysisData {
  market_analysis: any;
  tech_stack: any;
  mvp_features: string[];
  premium_roadmap: string[];
}

const AnalysisForm: React.FC = () => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    budget: '',
    aspirations: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisData | null>(null);

  const handlePropel = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await axios.post('http://localhost:3001/api/analyze', 
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setResult(response.data.analysis);
    } catch (error) {
      console.error("Propel failed:", error);
      alert("Error connecting to server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-card">
      <h2 className="form-title">Propel Your Vision</h2>
      
      <form onSubmit={handlePropel} className="propel-form">
        <div className="input-group">
          <label>Project Name</label>
          <input 
            type="text" 
            onChange={(e) => setFormData({...formData, title: e.target.value})} 
            required 
          />
        </div>

        <div className="input-group">
          <label>The Vision</label>
          <textarea 
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            required
          />
        </div>

        <div className="form-row">
          <div className="input-group">
            <label>Budget ($)</label>
            <input 
              type="number" 
              onChange={(e) => setFormData({...formData, budget: e.target.value})} 
              required 
            />
          </div>
          <div className="input-group">
            <label>Ultimate Goal</label>
            <input 
              type="text" 
              onChange={(e) => setFormData({...formData, aspirations: e.target.value})} 
              required 
            />
          </div>
        </div>

        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? 'GENERATING...' : 'PROPEL NOW'}
        </button>
      </form>

      {result && (
        <div className="results-box">
          <h3>Strategic Analysis</h3>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default AnalysisForm;