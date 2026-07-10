import os
import logging

logger = logging.getLogger(__name__)

def generate_local_fallback_insights(stats_data):
    """
    Highly polished rule-based template fallback to generate realistic personal 
    attendance insights in case Gemini is not configured or fails.
    """
    overall = stats_data.get('overall_attendance', 100.0)
    subjects = stats_data.get('subjects', [])
    score = stats_data.get('score', 100)
    score_lbl = stats_data.get('score_label', 'Excellent')
    streak = stats_data.get('current_streak', 0)
    longest_streak = stats_data.get('longest_present_streak', 0)
    late_cnt = stats_data.get('late_count', 0)

    insights = []

    # 1. Overall Attendance & Score summary
    if overall >= 75:
        insights.append(
            f"Overall Standing: You are maintaining a healthy overall attendance of {overall}%, earning you a '{score_lbl}' rating (Score: {score}/100) on your Smartttend Consistency Meter. Keep up this standard!"
        )
    else:
        insights.append(
            f"Action Required: Your cumulative average has dropped to {overall}%, which is below the university's 75% cutoff threshold. Your current attendance score is {score}/100 ('{score_lbl}'). Immediate check-ins are recommended."
        )

    # 2. Subject Specific warnings
    if subjects:
        # Find subject with lowest attendance
        lowest_sub = min(subjects, key=lambda x: x['percentage'])
        if lowest_sub['percentage'] < 75:
            # Calculate needed classes
            attended = lowest_sub['present'] + lowest_sub['late']
            total = lowest_sub['total']
            needed = 0
            if total > 0:
                needed = max(0, int((0.75 * total - attended) / 0.25))
            insights.append(
                f"Critical Subject Alert: Your attendance in '{lowest_sub['name']}' ({lowest_sub['code']}) is currently at {lowest_sub['percentage']}%. You need to attend the next {needed or 3} scheduled lectures for this subject consecutively to bring your percentage back above the 75% target."
            )
        else:
            # Showcase highest subject
            highest_sub = max(subjects, key=lambda x: x['percentage'])
            insights.append(
                f"Peak Performance: You have excellent standing in '{highest_sub['name']}' ({highest_sub['code']}) at {highest_sub['percentage']}%. Great consistency here!"
            )

    # 3. Punctuality analysis
    if late_cnt > 0:
        insights.append(
            f"Punctuality Check: You have {late_cnt} late check-ins on record. Arriving late slightly offsets your overall punctuality index. Try to set alarms 15 minutes prior to lectures to prevent check-ins slipping from 'Present' to 'Late'."
        )

    # 4. Streak motivations
    if streak >= 3:
        insights.append(
            f"Streak Streak! You are currently on a {streak}-lecture attendance streak. Can you push it to {streak + 5} lectures? Consistency is key for academic credits!"
        )
    elif longest_streak > 5:
        insights.append(
            f"Praise: Your highest historical consistency streak is {longest_streak} consecutive lectures. Let's aim to beat that record this month!"
        )
        
    return " \n\n".join(insights)

def get_gemini_insights(stats_data):
    """
    Assembles attendance stats, sends them to Gemini for summarization/advice, 
    and returns a user-friendly analysis. Falls back to local advice if key is missing.
    """
    api_key = os.environ.get('GEMINI_API_KEY')
    if not api_key:
        logger.info("GEMINI_API_KEY is not set. Generating local fallback insights.")
        return generate_local_fallback_insights(stats_data)
        
    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        
        # We use the standard gemini-1.5-flash or gemini-2.5-flash model
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        prompt = f"""
        You are 'Smartttend AI', a helpful, professional, and friendly academic assistant advising a college student on their lecture attendance.
        Analyze their attendance statistics, identify warnings/trends, and write 3-4 bulleted sentences of advice.
        Be specific, cite subject codes, compute calculations accurately based on the data, and make recommendations encouraging credits success.

        Student Stats:
        - Overall Attendance: {stats_data.get('overall_attendance')}%
        - Consistency Score: {stats_data.get('score')}/100 ({stats_data.get('score_label')})
        - Active Present Streak: {stats_data.get('current_streak')} lectures
        - Longest Streak: {stats_data.get('longest_present_streak')} lectures
        - Late Check-ins Count: {stats_data.get('late_count')}
        - Subjects summary: {stats_data.get('subjects')}

        Guidelines:
        1. Keep the output under 150 words.
        2. Format as a clean string of paragraphs with bullet points.
        3. Do not mention system variables or JSON formatting.
        4. Focus on low subjects, streak motivators, and punctuality advice.
        """
        
        response = model.generate_content(prompt)
        return response.text.strip()
        
    except Exception as e:
        logger.error(f"Error invoking Gemini API: {str(e)}. Falling back to local analyzer.")
        return generate_local_fallback_insights(stats_data)
