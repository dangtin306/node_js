import axios from 'axios';

export default async function get_json_live() {
    const config = {
        method: 'post',
        url: 'http://localhost:2999/main_1/mongo_1/api/mongo_get_query_api',
        headers: {
            'Content-Type': 'application/json'
        },
        data: {
            query: 'media.audio.lives_url'
        },
        maxBodyLength: Infinity
    };

    try {
        const response = await axios.request(config);
        return response.data; // ✅ Trả về object
    } catch (error) {
        console.error('Error fetching data:', error);
        return null;
    }
}
