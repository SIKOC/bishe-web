import osmnx as ox
import requests
from requests.adapters import HTTPAdapter
from requests.packages.urllib3.util.retry import Retry

# 设置自定义的requests session以增加重试机制
session = requests.Session()
retry_strategy = Retry(
    total=5,  # 总共重试次数
    backoff_factor=1,  # 在每次重试之间等待的时间因子
    status_forcelist=[500, 502, 503, 504]  # 哪些HTTP状态码会触发重试
)
adapter = HTTPAdapter(max_retries=retry_strategy)
session.mount("https://", adapter)

# 设置OSMnx使用自定义的session
ox.config(use_cache=True, log_console=True, requests_session=session)
ox.settings.nominatim_endpoint = "https://nominatim.openstreetmap.de"

try:
    # 尝试获取南昌市的地理编码数据
    gdf = ox.geocode_to_gdf("Nanchang, China")
    print("地理编码数据获取成功")
except Exception as e:
    print("地理编码数据获取失败:", str(e))