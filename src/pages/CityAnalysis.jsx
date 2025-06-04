import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as echarts from 'echarts';
import '../styles/CityAnalysis.css';
import { get_backend_url } from '../utils/url';

const API_BASE_URL = get_backend_url();

function CityAnalysis() {
  const navigate = useNavigate();
  const radarChartRef = useRef(null);
  const barChartRef = useRef(null);
  const [selectedCities, setSelectedCities] = useState(['北京', '上海']);
  const [activeTab, setActiveTab] = useState('radar');
  const [cityData, setCityData] = useState({
    '北京': {
      薪资水平: 85,
      生活成本: 90,
      政策优惠: 80,
      就业机会: 95,
      生活质量: 75,
      发展潜力: 88
    },
    '上海': {
      薪资水平: 90,
      生活成本: 95,
      政策优惠: 75,
      就业机会: 90,
      生活质量: 80,
      发展潜力: 85
    },
    '深圳': {
      薪资水平: 88,
      生活成本: 85,
      政策优惠: 85,
      就业机会: 92,
      生活质量: 78,
      发展潜力: 90
    },
    '广州': {
      薪资水平: 75,
      生活成本: 70,
      政策优惠: 80,
      就业机会: 85,
      生活质量: 82,
      发展潜力: 78
    },
    '杭州': {
      薪资水平: 82,
      生活成本: 75,
      政策优惠: 88,
      就业机会: 87,
      生活质量: 85,
      发展潜力: 86
    },
    '苏州': {
      薪资水平: 70,
      生活成本: 65,
      政策优惠: 85,
      就业机会: 80,
      生活质量: 88,
      发展潜力: 82
    }
  });

  // 新增状态
  const [searchCity, setSearchCity] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const indicators = ['薪资水平', '生活成本', '政策优惠', '就业机会', '生活质量', '发展潜力'];

  // 为每个城市动态分配颜色
  const generateCityColor = (cityName) => {
    const colors = [
      { fill: 'rgba(255, 99, 132, 0.6)', border: 'rgb(255, 99, 132)' },
      { fill: 'rgba(54, 162, 235, 0.6)', border: 'rgb(54, 162, 235)' },
      { fill: 'rgba(255, 205, 86, 0.6)', border: 'rgb(255, 205, 86)' },
      { fill: 'rgba(75, 192, 192, 0.6)', border: 'rgb(75, 192, 192)' },
      { fill: 'rgba(153, 102, 255, 0.6)', border: 'rgb(153, 102, 255)' },
      { fill: 'rgba(255, 159, 64, 0.6)', border: 'rgb(255, 159, 64)' },
      { fill: 'rgba(199, 199, 199, 0.6)', border: 'rgb(199, 199, 199)' },
      { fill: 'rgba(83, 102, 255, 0.6)', border: 'rgb(83, 102, 255)' },
      { fill: 'rgba(255, 99, 255, 0.6)', border: 'rgb(255, 99, 255)' },
      { fill: 'rgba(99, 255, 132, 0.6)', border: 'rgb(99, 255, 132)' }
    ];
    
    const cities = Object.keys(cityData);
    const index = cities.indexOf(cityName) % colors.length;
    return colors[index];
  };

  // 获取城市分析数据
  const fetchCityData = async (cityName) => {
    try {
      setIsLoading(true);
      setError('');
      
      const response = await fetch(`${API_BASE_URL}/city`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city: cityName }),
      });
      
      if (!response.ok) {
        throw new Error(`获取${cityName}数据失败`);
      }
      
      const responseText = await response.text();
      
      try {
        // 尝试解析JSON响应
        const data = JSON.parse(responseText);
        return data;
      } catch (parseError) {
        // 如果不是标准JSON，尝试从文本中提取JSON
        const jsonMatch = responseText.match(/\{[^}]*\}/);
        if (jsonMatch) {
          const data = JSON.parse(jsonMatch[0]);
          return data;
        }
        throw new Error('返回数据格式不正确');
      }
    } catch (err) {
      console.error('获取城市数据失败:', err);
      // 如果API调用失败，返回默认数据
      return {
        薪资水平: 70,
        生活成本: 70,
        政策优惠: 70,
        就业机会: 70,
        生活质量: 70,
        发展潜力: 70
      };
    } finally {
      setIsLoading(false);
    }
  };

  // 添加新城市
  const handleAddCity = async () => {
    if (!searchCity.trim()) {
      setError('请输入城市名称');
      return;
    }
    
    if (Object.keys(cityData).includes(searchCity.trim())) {
      setError('该城市已存在');
      return;
    }
    
    if (Object.keys(cityData).length >= 10) {
      setError('最多支持10个城市对比');
      return;
    }
    
    const newCityData = await fetchCityData(searchCity.trim());
    
    // 添加新城市数据
    setCityData(prev => ({
      ...prev,
      [searchCity.trim()]: newCityData
    }));
    
    // 自动选中新添加的城市
    if (selectedCities.length < 6) {
      setSelectedCities(prev => [...prev, searchCity.trim()]);
    }
    
    setSearchCity('');
    setError('');
  };

  // 删除城市
  const handleRemoveCity = (cityName) => {
    // 不能删除默认城市
    const defaultCities = ['北京', '上海', '深圳', '广州', '杭州', '苏州'];
    if (defaultCities.includes(cityName)) {
      return;
    }
    
    // 从选中城市中移除
    setSelectedCities(prev => prev.filter(city => city !== cityName));
    
    // 从城市数据中移除
    setCityData(prev => {
      const newData = { ...prev };
      delete newData[cityName];
      return newData;
    });
  };

  // 处理城市选择
  const handleCityToggle = (city) => {
    if (selectedCities.includes(city)) {
      if (selectedCities.length > 1) {
        setSelectedCities(selectedCities.filter(c => c !== city));
      }
    } else {
      if (selectedCities.length < 6) {
        setSelectedCities([...selectedCities, city]);
      }
    }
  };

  // 初始化雷达图
  useEffect(() => {
    if (radarChartRef.current && activeTab === 'radar') {
      const chart = echarts.init(radarChartRef.current);
      
      const option = {
        title: {
          text: '城市综合分析雷达图',
          left: 'center',
          textStyle: {
            fontSize: 18,
            fontWeight: 'bold'
          }
        },
        tooltip: {
          trigger: 'item',
          formatter: function(params) {
            const data = params.data;
            const cityColor = generateCityColor(data.name).border;
            let result = `<div style="display: flex; align-items: center; margin-bottom: 8px;">
              <span style="display: inline-block; width: 12px; height: 12px; background-color: ${cityColor}; border-radius: 50%; margin-right: 8px;"></span>
              <strong>${data.name}</strong>
            </div>`;
            indicators.forEach((indicator, index) => {
              result += `${indicator}: <strong>${data.value[index]}</strong><br/>`;
            });
            return result;
          }
        },
        legend: {
          data: selectedCities,
          bottom: 20,
          textStyle: {
            fontSize: 12
          }
        },
        color: selectedCities.map(city => generateCityColor(city).border),
        radar: {
          indicator: indicators.map(name => ({
            name,
            max: 100,
            nameTextStyle: {
              fontSize: 12,
              color: '#333'
            }
          })),
          radius: '65%',
          splitNumber: 5,
          splitLine: {
            lineStyle: {
              color: '#e6e6e6'
            }
          },
          splitArea: {
            areaStyle: {
              color: ['rgba(250,250,250,0.3)', 'rgba(200,200,200,0.3)']
            }
          }
        },
        series: [{
          type: 'radar',
          data: selectedCities.map((city) => {
            return {
              value: indicators.map(indicator => cityData[city][indicator]),
              name: city,
              areaStyle: {
                color: generateCityColor(city).fill
              },
              lineStyle: {
                color: generateCityColor(city).border,
                width: 2
              },
              symbol: 'circle',
              symbolSize: 6
            };
          })
        }]
      };

      chart.setOption(option);
      
      // 响应式处理
      const handleResize = () => chart.resize();
      window.addEventListener('resize', handleResize);
      
      return () => {
        window.removeEventListener('resize', handleResize);
        chart.dispose();
      };
    }
  }, [selectedCities, activeTab]);

  // 初始化柱状图
  useEffect(() => {
    if (barChartRef.current && activeTab === 'bar') {
      const chart = echarts.init(barChartRef.current);
      
      const option = {
        title: {
          text: '城市各维度对比',
          left: 'center',
          textStyle: {
            fontSize: 18,
            fontWeight: 'bold'
          }
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow'
          },
          formatter: function(params) {
            let result = `<strong>${params[0].axisValue}</strong><br/>`;
            params.forEach(param => {
              const cityColor = generateCityColor(param.seriesName).border;
              result += `<div style="display: flex; align-items: center; margin: 4px 0;">
                <span style="display: inline-block; width: 12px; height: 12px; background-color: ${cityColor}; border-radius: 50%; margin-right: 8px;"></span>
                ${param.seriesName}: <strong>${param.value}</strong>
              </div>`;
            });
            return result;
          }
        },
        legend: {
          data: selectedCities,
          bottom: 20
        },
        color: selectedCities.map(city => generateCityColor(city).border),
        grid: {
          left: '3%',
          right: '4%',
          bottom: '15%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: indicators,
          axisLabel: {
            rotate: 45,
            fontSize: 10
          }
        },
        yAxis: {
          type: 'value',
          max: 100,
          axisLabel: {
            formatter: '{value}'
          }
        },
        series: selectedCities.map((city) => {
          return {
            name: city,
            type: 'bar',
            data: indicators.map(indicator => cityData[city][indicator]),
            itemStyle: {
              color: generateCityColor(city).border
            }
          };
        })
      };

      chart.setOption(option);
      
      const handleResize = () => chart.resize();
      window.addEventListener('resize', handleResize);
      
      return () => {
        window.removeEventListener('resize', handleResize);
        chart.dispose();
      };
    }
  }, [selectedCities, activeTab]);

  // 计算综合得分
  const calculateOverallScore = (city) => {
    const data = cityData[city];
    const weights = {
      薪资水平: 0.25,
      生活成本: -0.15, // 生活成本越低越好
      政策优惠: 0.2,
      就业机会: 0.25,
      生活质量: 0.15,
      发展潜力: 0.1
    };
    
    let score = 0;
    Object.keys(weights).forEach(key => {
      score += data[key] * weights[key];
    });
    
    return Math.round(score);
  };

  return (
    <div className="city-analysis-container">
      {/* 头部导航 */}
      <div className="analysis-header">
        <button 
          className="back-button"
          onClick={() => navigate('/chat')}
        >
          ← 返回聊天
        </button>
        <h1>城市生活成本与发展潜力分析</h1>
        <div className="header-subtitle">
          基于人才引进政策的城市对比分析工具
        </div>
      </div>

      {/* 城市选择器 */}
      <div className="city-selector">
        <h3>选择对比城市（最多6个）：</h3>
        
        {/* 城市搜索和添加 */}
        <div className="city-search-section">
          <div className="search-input-group">
            <input
              type="text"
              placeholder="输入城市名称（如：南京、成都等）"
              value={searchCity}
              onChange={(e) => setSearchCity(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleAddCity();
                }
              }}
              className="city-search-input"
              disabled={isLoading}
            />
            <button 
              onClick={handleAddCity}
              disabled={isLoading || !searchCity.trim()}
              className="add-city-button"
            >
              {isLoading ? '分析中...' : '添加城市'}
            </button>
          </div>
          {error && <div className="error-message">{error}</div>}
        </div>
        
        <div className="city-buttons">
          {Object.keys(cityData).map(city => (
            <div key={city} className="city-button-container">
              <button
                className={`city-button ${selectedCities.includes(city) ? 'selected' : ''}`}
                onClick={() => handleCityToggle(city)}
                disabled={!selectedCities.includes(city) && selectedCities.length >= 6}
              >
                <span 
                  className="city-color-indicator"
                  style={{ backgroundColor: generateCityColor(city).border }}
                ></span>
                {city}
                {selectedCities.includes(city) && <span className="checkmark">✓</span>}
              </button>
              {/* 只有默认城市之外的城市才显示删除按钮 */}
              {!['北京', '上海', '深圳', '广州', '杭州', '苏州'].includes(city) && (
                <button
                  className="remove-city-button"
                  onClick={() => handleRemoveCity(city)}
                  title={`删除${city}`}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="selection-info">
          已选择 {selectedCities.length} 个城市，共有 {Object.keys(cityData).length} 个城市可选
        </div>
      </div>

      {/* 图表切换标签 */}
      <div className="chart-tabs">
        <button 
          className={`tab-button ${activeTab === 'radar' ? 'active' : ''}`}
          onClick={() => setActiveTab('radar')}
        >
          雷达图分析
        </button>
        <button 
          className={`tab-button ${activeTab === 'bar' ? 'active' : ''}`}
          onClick={() => setActiveTab('bar')}
        >
          柱状图对比
        </button>
        <button 
          className={`tab-button ${activeTab === 'table' ? 'active' : ''}`}
          onClick={() => setActiveTab('table')}
        >
          数据详情
        </button>
      </div>

      {/* 图表容器 */}
      <div className="chart-container">
        {activeTab === 'radar' && (
          <div className="chart-wrapper">
            <div ref={radarChartRef} className="chart"></div>
          </div>
        )}
        
        {activeTab === 'bar' && (
          <div className="chart-wrapper">
            <div ref={barChartRef} className="chart"></div>
          </div>
        )}

        {activeTab === 'table' && (
          <div className="data-table-container">
            <h3>详细数据对比</h3>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>城市</th>
                    {indicators.map(indicator => (
                      <th key={indicator}>{indicator}</th>
                    ))}
                    <th>综合得分</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedCities.map(city => (
                    <tr key={city}>
                      <td className="city-name">
                        <span 
                          className="city-color-indicator"
                          style={{ backgroundColor: generateCityColor(city).border }}
                        ></span>
                        {city}
                      </td>
                      {indicators.map(indicator => (
                        <td key={indicator} className="data-cell">
                          <div className="data-value">{cityData[city][indicator]}</div>
                          <div className="data-bar">
                            <div 
                              className="data-bar-fill"
                              style={{ width: `${cityData[city][indicator]}%` }}
                            ></div>
                          </div>
                        </td>
                      ))}
                      <td className="overall-score">
                        {calculateOverallScore(city)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 数据说明 */}
      <div className="data-explanation">
        <h3>数据说明</h3>
        <div className="explanation-grid">
          <div className="explanation-item">
            <strong>薪资水平：</strong>基于平均工资、薪资增长率等指标
          </div>
          <div className="explanation-item">
            <strong>生活成本：</strong>包含房价、物价、交通等生活支出
          </div>
          <div className="explanation-item">
            <strong>政策优惠：</strong>人才补贴、税收优惠、住房政策等
          </div>
          <div className="explanation-item">
            <strong>就业机会：</strong>岗位数量、行业发展、企业密度等
          </div>
          <div className="explanation-item">
            <strong>生活质量：</strong>教育、医疗、环境、文化等资源
          </div>
          <div className="explanation-item">
            <strong>发展潜力：</strong>GDP增长、产业布局、创新能力等
          </div>
        </div>
        <div className="dynamic-feature-note">
          <h4>🚀 动态城市分析功能</h4>
          <p>
            系统支持动态添加任意城市进行分析,系统会基于知识库中的政策信息和大模型分析，
            为新添加的城市生成6个维度的评分数据。只需在上方搜索框中输入城市名称即可添加。
          </p>
          <p>
            <strong>注意：</strong>新城市的分析数据基于AI分析生成，仅供参考。
            建议结合实际情况和官方数据进行决策。
          </p>
        </div>
      </div>
    </div>
  );
}

export default CityAnalysis; 