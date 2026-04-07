export interface FieldDescription {
    key: string
    label: string
    description?: string
}

export interface HealthTypeMetadata {
    type: number
    name: string
    nameEn: string
    sheetName?: string
    sampleKeys: string[]
    description?: string
    fields: FieldDescription[]
}

export const HEALTH_TYPE_METADATA: Record<number, HealthTypeMetadata> = {
    7: {
        type: 7,
        name: '心率',
        nameEn: 'Heart rate',
        sampleKeys: ['DATA_POINT_DYNAMIC_HEARTRATE'],
        description: '来自基础心率类型表，样本值通常直接是 BPM 数字字符串。',
        fields: [
            {key: 'value', label: '心率值', description: '示例值为 88，单位 BPM。'}
        ]
    },
    8: {
        type: 8,
        name: '体脂',
        nameEn: 'Body fat rate',
        sheetName: 'BroadBodyFat',
        sampleKeys: ['WEIGHT_BODYFAT_BROAD'],
        description: '来自 BroadBodyFat 工作表，值是 JSON 字符串，包含体重、体脂率、BMI 等复合指标。',
        fields: [
            {key: 'bodyWeight', label: '体重', description: '单位 kg。'},
            {key: 'bodyFatRate', label: '体脂率', description: '单位 %。'},
            {key: 'bmi', label: 'BMI'},
            {key: 'muscleMass', label: '肌肉量', description: '单位 kg。'},
            {key: 'basalMetabolism', label: '基础代谢', description: '单位 kcal/day。'},
            {key: 'visceralFatLevel', label: '内脏脂肪等级'},
            {key: 'heartRate', label: '测量时心率'}
        ]
    },
    10006: {
        type: 10006,
        name: '体脂(新)',
        nameEn: 'Broad body fat',
        sheetName: 'BroadBodyFat',
        sampleKeys: ['WEIGHT_BODYFAT_BROAD'],
        description: 'Key health value definition 指向 BroadBodyFat。结构与体脂类型一致，通常是新版应用使用的体脂字段。',
        fields: [
            {key: 'bodyWeight', label: '体重', description: '单位 kg。'},
            {key: 'bodyFatRate', label: '体脂率', description: '单位 %。'},
            {key: 'bmi', label: 'BMI'},
            {key: 'basalMetabolism', label: '基础代谢', description: '单位 kcal/day。'},
            {key: 'muscleMass', label: '肌肉量', description: '单位 kg。'},
            {key: 'visceralFatLevel', label: '内脏脂肪等级'},
            {key: 'heartRate', label: '测量时心率'}
        ]
    },
    300002: {
        type: 300002,
        name: '运动目标达成数据',
        nameEn: 'sportGoalAchievementData',
        sheetName: 'sportGoalAchievementData',
        sampleKeys: ['SPORT_GOAL_ACHIEVEMENT_DATA'],
        description: '记录每日步数、热量、活动小时和中高强度时长目标是否达成。',
        fields: [
            {key: 'stepGoalValue', label: '步数目标值'},
            {key: 'stepUserValue', label: '用户步数'},
            {key: 'stepGoalState', label: '步数目标达成状态'},
            {key: 'stepIsRing', label: '步数是否参与三环'},
            {key: 'calorieGoalValue', label: '热量目标值'},
            {key: 'calorieUserValue', label: '用户热量'},
            {key: 'durationGoalState', label: '中高强度时长目标达成状态'},
            {key: 'activeGoalState', label: '活动小时数目标达成状态'}
        ]
    },
    500018: {
        type: 500018,
        name: '静息代谢',
        nameEn: 'BasalMetabolism',
        sheetName: 'BasalMetabolism',
        sampleKeys: ['BASAL_METABOLISM'],
        description: '记录基础代谢值，样本值是 JSON 字符串。',
        fields: [
            {key: 'basalMetabolism', label: '静息代谢'}
        ]
    },
    500023: {
        type: 500023,
        name: '动态心率',
        nameEn: 'DynamicHeartRate',
        sheetName: 'DynamicHeartRate',
        sampleKeys: ['DYNAMIC_HEART_RATE'],
        description: '样本值是 JSON 字符串，核心字段为 bpm。',
        fields: [
            {key: 'bpm', label: '动态心率', description: '打点动态心率。'}
        ]
    },
    600002: {
        type: 600002,
        name: '饮食记录',
        nameEn: 'Diet record',
        sampleKeys: ['DIET_RECORD'],
        description: '说明表未直接命中，页面按实测结构解析 fieldsMetadata.dietRecord。',
        fields: [
            {key: 'fieldsMetadata.dietRecord.localDate', label: '本地日期'},
            {key: 'fieldsMetadata.dietRecord.meals', label: '餐次列表'},
            {key: 'fieldsMetadata.dietRecord.overview', label: '饮食概览'}
        ]
    },
    600004: {
        type: 600004,
        name: '营养记录',
        nameEn: 'Nutrition record',
        sampleKeys: ['NUTRITION_RECORD'],
        description: '说明表未直接命中，页面按样本值 JSON 自动推断字段。',
        fields: [
            {key: 'dietaryEnergy', label: '摄入能量'},
            {key: 'meal', label: '餐次'},
            {key: 'mealRecordTime', label: '记录时间'}
        ]
    }
}

export function getHealthTypeMetadata(type: number): HealthTypeMetadata | undefined {
    return HEALTH_TYPE_METADATA[type]
}
