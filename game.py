"""Game state management for the Walmart Team Quiz Show.

All players answer simultaneously. First correct answer = 10 pts,
second = 9 pts, third = 8 pts, etc. Wrong answers = 0 pts.
"""

import time
from dataclasses import dataclass, field

QUESTIONS = [
    {
        "category": "History",
        "question": "In what year did Sam Walton open the first Walmart store?",
        "options": ["1960", "1962", "1965", "1970"],
        "answer": 1,
        "explanation": "Sam Walton opened the first Walmart Discount City store on July 2, 1962, in Rogers, Arkansas.",
    },
    {
        "category": "History",
        "question": "What was Sam Walton's first retail venture before Walmart?",
        "options": ["A Kmart franchise", "A Ben Franklin variety store", "A Sears outlet", "A JCPenney store"],
        "answer": 1,
        "explanation": "Sam Walton operated a Ben Franklin variety store franchise in Newport, Arkansas, starting in 1945.",
    },
    {
        "category": "History",
        "question": "In what year did Walmart become the world's largest company by revenue for the first time?",
        "options": ["1990", "1995", "2002", "2008"],
        "answer": 2,
        "explanation": "Walmart first topped the Fortune 500 list as the world's largest company by revenue in 2002.",
    },
    {
        "category": "Founder",
        "question": "What was Sam Walton's famous mode of transportation that reflected his frugality?",
        "options": ["A bicycle", "An old pickup truck", "Public transit", "A compact sedan"],
        "answer": 1,
        "explanation": "Sam Walton was famously known for driving an old pickup truck despite being one of the richest people in America.",
    },
    {
        "category": "Founder",
        "question": "What is the title of Sam Walton's autobiography?",
        "options": ["The Walmart Way", "Made in America", "Everyday Low Prices", "Retail Revolution"],
        "answer": 1,
        "explanation": "Sam Walton's autobiography is titled 'Made in America: My Story,' published in 1992.",
    },
    {
        "category": "Global",
        "question": "Approximately how many countries does Walmart operate in (as of 2025)?",
        "options": ["10", "19", "25", "35"],
        "answer": 1,
        "explanation": "Walmart operates in approximately 19 countries worldwide under various brand names.",
    },
    {
        "category": "Global",
        "question": "What is the name of Walmart's retail operations in Mexico?",
        "options": ["Walmart Mexico", "Walmex", "MexiMart", "Bodega Walmart"],
        "answer": 1,
        "explanation": "Walmart's operations in Mexico and Central America are known as Walmex.",
    },
    {
        "category": "Culture",
        "question": "What is the name of the iconic Walmart symbol/logo element?",
        "options": ["The Star", "The Spark", "The Sun", "The Burst"],
        "answer": 1,
        "explanation": "The Walmart Spark is the iconic yellow symbol that has been part of Walmart's branding since 2008.",
    },
    {
        "category": "Operations",
        "question": "What is the name of Walmart's subscription service that competes with Amazon Prime?",
        "options": ["Walmart+", "Walmart Prime", "Walmart Select", "Walmart Unlimited"],
        "answer": 0,
        "explanation": "Walmart+ launched in September 2020, offering free delivery, fuel discounts, and more.",
    },
    {
        "category": "Fun Fact",
        "question": "Approximately how many associates does Walmart employ worldwide?",
        "options": ["500,000", "1.2 million", "2.1 million", "3.5 million"],
        "answer": 2,
        "explanation": "Walmart employs approximately 2.1 million associates worldwide, the largest private employer.",
    },
    {
        "category": "Fun Fact",
        "question": "How many customers visit Walmart stores and websites each week globally?",
        "options": ["100 million", "150 million", "240 million", "500 million"],
        "answer": 2,
        "explanation": "Approximately 240 million customers and members visit Walmart each week worldwide.",
    },
    {
        "category": "Sustainability",
        "question": "What is the name of Walmart's sustainability initiative to reduce supply chain emissions?",
        "options": ["Project Green", "Project Gigaton", "Project Zero", "Project Earth"],
        "answer": 1,
        "explanation": "Project Gigaton aims to avoid one billion metric tons of greenhouse gas emissions by 2030.",
    },
    {
        "category": "Operations",
        "question": "What term does Walmart use for temporary price reductions on products?",
        "options": ["Flash Sales", "Price Cuts", "Rollbacks", "Deal Days"],
        "answer": 2,
        "explanation": "'Rollbacks' are Walmart's temporary price reductions, going even below EDLP.",
    },
    {
        "category": "Fun Fact",
        "question": "What is the approximate annual revenue of Walmart (fiscal year 2025)?",
        "options": ["$350 billion", "$450 billion", "$650 billion", "$800 billion"],
        "answer": 2,
        "explanation": "Walmart's annual revenue is approximately $650 billion, the world's largest by revenue.",
    },
    {
        "category": "History",
        "question": "In what year did Walmart go public on the New York Stock Exchange?",
        "options": ["1968", "1970", "1972", "1975"],
        "answer": 1,
        "explanation": "Walmart went public on October 1, 1970. Its first stock was traded at $16.50 per share.",
    },
]

MAX_FIRST_PLACE_POINTS = 10
TIME_LIMIT = 20  # seconds


@dataclass
class Player:
    name: str
    score: int = 0
    correct_count: int = 0
    total_time: float = 0.0


@dataclass
class GameRoom:
    """A single quiz game session.

    All players answer simultaneously. Correct answers are ranked by speed:
    1st correct = 10 pts, 2nd = 9 pts, ..., 10th+ = 1 pt.
    Wrong answers = 0 pts.
    """

    room_code: str
    players: dict[str, Player] = field(default_factory=dict)
    current_question: int = -1
    question_start_time: float = 0.0
    state: str = "lobby"  # lobby | playing | reveal | finished
    # Per-question tracking
    correct_order: list[str] = field(default_factory=list)  # keys in order of correct answers
    answered_players: set[str] = field(default_factory=set)  # all who answered (right or wrong)

    @property
    def total_questions(self) -> int:
        return len(QUESTIONS)

    def add_player(self, name: str) -> bool:
        key = name.lower()
        if key in self.players or self.state != "lobby":
            return False
        self.players[key] = Player(name=name)
        return True

    def start_game(self) -> bool:
        if len(self.players) < 2 or self.state != "lobby":
            return False
        self.state = "playing"
        return True

    def next_question(self) -> dict | None:
        """Advance to the next question. Returns question data or None if done."""
        self.current_question += 1
        if self.current_question >= len(QUESTIONS):
            self.state = "finished"
            return None
        self.correct_order = []
        self.answered_players = set()
        self.question_start_time = time.time()
        self.state = "playing"
        q = QUESTIONS[self.current_question]
        return {
            "category": q["category"],
            "question": q["question"],
            "options": q["options"],
            "qNumber": self.current_question + 1,
            "total": len(QUESTIONS),
        }

    def submit_answer(self, player_key: str, option: int) -> dict:
        """A player submits their answer. Returns result info."""
        if self.state != "playing":
            return {"valid": False}
        if player_key in self.answered_players:
            return {"valid": False}  # already answered

        q = QUESTIONS[self.current_question]
        elapsed = time.time() - self.question_start_time
        is_correct = option == q["answer"]
        points = 0

        self.answered_players.add(player_key)

        if is_correct:
            rank = len(self.correct_order)  # 0-based rank
            points = max(1, MAX_FIRST_PLACE_POINTS - rank)  # 10, 9, 8, ... 1
            self.correct_order.append(player_key)
            player = self.players[player_key]
            player.score += points
            player.correct_count += 1
            player.total_time += elapsed

        all_answered = len(self.answered_players) >= len(self.players)
        if all_answered:
            self.state = "reveal"

        return {
            "valid": True,
            "correct": is_correct,
            "points": points,
            "rank": len(self.correct_order) if is_correct else 0,
            "elapsed": round(elapsed, 2),
            "allAnswered": all_answered,
            "answeredCount": len(self.answered_players),
            "totalPlayers": len(self.players),
            "correctAnswer": q["answer"],
            "correctText": q["options"][q["answer"]],
            "explanation": q["explanation"],
        }

    def get_question_summary(self) -> dict:
        """Summary shown after everyone answers or time expires."""
        q = QUESTIONS[self.current_question]
        results = []
        for key in self.correct_order:
            p = self.players[key]
            rank = self.correct_order.index(key)
            pts = max(1, MAX_FIRST_PLACE_POINTS - rank)
            results.append({"name": p.name, "points": pts, "rank": rank + 1})
        # Add players who got it wrong or didn't answer
        for key, p in self.players.items():
            if key not in self.correct_order:
                results.append({"name": p.name, "points": 0, "rank": 0})
        return {
            "correctAnswer": q["answer"],
            "correctText": q["options"][q["answer"]],
            "explanation": q["explanation"],
            "results": results,
            "leaderboard": self.get_leaderboard(),
        }

    def force_time_up(self) -> dict:
        """Called when timer expires. Marks question as revealed."""
        self.state = "reveal"
        return self.get_question_summary()

    def get_leaderboard(self) -> list[dict]:
        sorted_players = sorted(
            self.players.values(),
            key=lambda p: (-p.score, p.total_time),
        )
        return [
            {
                "name": p.name,
                "score": p.score,
                "correct": p.correct_count,
                "total": len(QUESTIONS),
                "avgTime": round(p.total_time / p.correct_count, 2) if p.correct_count else 0,
            }
            for p in sorted_players
        ]

    def get_player_names(self) -> list[str]:
        return [p.name for p in self.players.values()]
