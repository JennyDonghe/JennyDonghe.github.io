document.addEventListener("DOMContentLoaded", function () {

    // LIKE SYSTEM: toggle color + increase number
    document.querySelectorAll(".post").forEach(post => {
        const likeBtn = post.querySelector(".like");
        const likeCount = post.querySelector(".like-count");

        let liked = false; // track if user already liked

        likeBtn.addEventListener("click", () => {
            liked = !liked; // toggle state

            if (liked) {
                likeBtn.classList.add("liked");
                likeCount.textContent = Number(likeCount.textContent) + 1;
            } else {
                likeBtn.classList.remove("liked");
                likeCount.textContent = Number(likeCount.textContent) - 1;
            }
        });
    });

    // COMMENT DROPDOWN
    document.querySelectorAll(".comment").forEach(commentBtn => {
        commentBtn.addEventListener("click", () => {
            const post = commentBtn.closest(".post");
            const comments = post.querySelector(".comments");
            if (comments) {
                comments.classList.toggle("visible");
            }
        });
    });

});
